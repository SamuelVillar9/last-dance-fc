begin;
create table private.attendance_fixture_state(
 match_key text primary key,
 fixture_date text not null,
 fixture_time text not null,
 fixture_venue text not null,
 fixture_status text not null,
 updated_at timestamptz not null default now()
);
alter table private.attendance_fixture_state enable row level security;
revoke all on private.attendance_fixture_state from public,anon,authenticated;
create or replace function private.attendance_scan_fixtures() returns void language plpgsql security definer set search_path='' as $$
declare f record; old record; u record; kind text; headline text; message text; due timestamptz;
begin
 for f in select distinct on (m->>'key') m->>'key' mk,m->>'date' match_date,coalesce(m->>'time','') match_time,
  coalesce(m->>'venue',m->>'court','') venue,m->>'status' status
  from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m
  where (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE')
   and m->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   and (m->>'date')::date <= (now() at time zone 'Europe/Madrid')::date+7
  order by m->>'key'
 loop
  select * into old from private.attendance_fixture_state where match_key=f.mk;
  kind:=null;
  if not found then
   if f.status='scheduled' then kind:='fixture';end if;
  elsif (old.fixture_date,old.fixture_time,old.fixture_venue,old.fixture_status)
    is distinct from (f.match_date,f.match_time,f.venue,f.status) then
   kind:='changed';
  end if;
  insert into private.attendance_fixture_state(match_key,fixture_date,fixture_time,fixture_venue,fixture_status)
  values(f.mk,f.match_date,f.match_time,f.venue,f.status)
  on conflict(match_key) do update set fixture_date=excluded.fixture_date,fixture_time=excluded.fixture_time,
   fixture_venue=excluded.fixture_venue,fixture_status=excluded.fixture_status,updated_at=now();
  if kind is null then continue;end if;
  if kind='fixture' then
   headline:='LAST DANCE · Nueva convocatoria';message:='Ya puedes confirmar tu asistencia al próximo partido.';
  else
   headline:='LAST DANCE · Cambio de partido';message:='Se han actualizado los datos del partido. Revisa la fecha, la hora o la pista.';
  end if;
  if f.status='scheduled' and f.match_time ~ '^[0-9]{2}:[0-9]{2}$' then
   due:=(f.match_date||' '||f.match_time)::timestamp at time zone 'Europe/Madrid';
  else
   due:=(f.match_date||' 23:59')::timestamp at time zone 'Europe/Madrid';
  end if;
  if due<=now() then continue;end if;
  for u in select a.user_id from private.team_accounts a join public.players p on p.id=a.player_id and p.active
   left join private.notification_settings s on s.user_id=a.user_id
   where (kind='changed' and coalesce(s.match_changes_push,true))
     or (kind='fixture' and coalesce(s.attendance_push,true)
      and not exists(select 1 from private.availability v where v.match_key=f.mk and v.player_id=a.player_id))
  loop
   perform private.attendance_enqueue(u.user_id,f.mk,kind,
    case when kind='fixture' then 'initial' else to_char(now() at time zone 'UTC','YYYYMMDDHH24MISS') end,
    headline,message,now());
  end loop;
 end loop;
end$$;
revoke all on function private.attendance_scan_fixtures() from public,anon,authenticated;
create or replace function public.attendance_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare j jsonb;v_status int;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Access denied';end if;
 if p_action='prepare' then
  perform private.attendance_scan_fixtures();
  -- Process official fixtures only. A postponed fixture without a valid time is excluded.
  v_status:=0;
  for j in
   select jsonb_build_object('mk',m->>'key','kickoff',(((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid'),
      'user_id',a.user_id,'reminders',coalesce(s.attendance_push,true),'activity',coalesce(s.attendance_activity_push,false)) as item
   from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches')m
   join private.team_accounts a on true join public.players p on p.id=a.player_id and p.active
   left join private.notification_settings s on s.user_id=a.user_id
   where (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE') and m->>'status'='scheduled'
     and m->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     and (((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid')>now()
     and not exists(select 1 from private.availability v where v.match_key=m->>'key' and v.player_id=a.player_id)
  loop
   v_status:=v_status+1;
   if (j->>'reminders')::boolean then
    if (j->>'kickoff')::timestamptz-now()<=interval '48 hours' and (j->>'kickoff')::timestamptz-now()>interval '24 hours' then
     perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','reminder48','48h','LAST DANCE · ¿Vienes al partido?','Faltan menos de 48 horas y todavía no has respondido. Confirma tu asistencia.',now());
    elsif (j->>'kickoff')::timestamptz-now()<=interval '24 hours' then
     perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','reminder24','24h','LAST DANCE · Último recordatorio','El partido se acerca. ¿Vienes, no vienes o tienes dudas?',now());
    end if;
   end if;
   if (j->>'activity')::boolean then
    if exists(select 1 from private.attendance_activity a where a.match_key=j->>'mk' and a.window_start=to_timestamp(floor(extract(epoch from now()-interval '30 minutes')/1800)*1800)) then
    perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','activity',
     to_char(to_timestamp(floor(extract(epoch from now()-interval '30 minutes')/1800)*1800) at time zone 'UTC','YYYYMMDDHH24MI'),
     'LAST DANCE · ¡El vestuario se mueve!',
     'Varios compañeros han actualizado su asistencia. ¡Falta tu respuesta!',
     now());
    end if;
   end if;
  end loop;
  return jsonb_build_object('prepared',v_status);
 elsif p_action='claim' then
  with picked as (
    select o.id from private.attendance_push_outbox o
    join private.attendance_notifications n on n.id=o.notification_id
    where not o.finished and o.available_at<=now() and (o.lease_until is null or o.lease_until<now()) and o.attempts<5
    and exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id and p.active where a.user_id=n.user_id
      and (n.kind='changed' or not exists(select 1 from private.availability v where v.match_key=n.match_key and v.player_id=a.player_id)))
    and exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches')m
      where m->>'key'=n.match_key and
      (n.kind='changed' or (m->>'status'='scheduled'
      and (((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid')>now())))
    and coalesce((select case when n.kind='activity' then attendance_activity_push when n.kind='changed' then match_changes_push else attendance_push end from private.notification_settings where user_id=n.user_id),n.kind<>'activity')
    order by o.available_at limit 50 for update of o skip locked
   ), claimed as (update private.attendance_push_outbox o set lease_until=now()+interval '2 minutes',attempts=o.attempts+1
    from picked where o.id=picked.id returning o.id,o.notification_id,o.subscription_id)
   select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) into j from (
    select c.id,n.match_key,n.title,n.body,s.endpoint,s.p256dh,s.auth
    from claimed c join private.attendance_notifications n on n.id=c.notification_id join private.push_subscriptions s on s.id=c.subscription_id
   )t;
  return j;
 elsif p_action='finish' then
  update private.attendance_push_outbox set finished=(p_payload->>'status')::int between 200 and 299
    or (p_payload->>'status')::int between 400 and 499 and (p_payload->>'status')::int not in (408,429),
    lease_until=null,available_at=now()+interval '1 minute'*power(2,least(attempts,5))
   where id=(p_payload->>'id')::uuid;
  if (p_payload->>'status')::int in (404,410) then
   delete from private.push_subscriptions where id=(select subscription_id from private.attendance_push_outbox where id=(p_payload->>'id')::uuid);
  end if;
  return '{"ok":true}'::jsonb;
 else raise exception 'Invalid action';end if;
end$$;

commit;
   and (m->>'date')::date <= (now() at time zone 'Europe/Madrid')::date+7
  order by m->>'key'
 loop
  select * into old from private.attendance_fixture_state where match_key=f.mk;
  kind:=null;
  if not found then
   if f.status='scheduled' then kind:='fixture';end if;
  elsif (old.fixture_date,old.fixture_time,old.fixture_venue,old.fixture_status)
    is distinct from (f.match_date,f.match_time,f.venue,f.status) then
   kind:='changed';
  end if;
  insert into private.attendance_fixture_state(match_key,fixture_date,fixture_time,fixture_venue,fixture_status)
  values(f.mk,f.match_date,f.match_time,f.venue,f.status)
  on conflict(match_key) do update set fixture_date=excluded.fixture_date,fixture_time=excluded.fixture_time,
   fixture_venue=excluded.fixture_venue,fixture_status=excluded.fixture_status,updated_at=now();
  if kind is null then continue;end if;
  if kind='fixture' then
   headline:='LAST DANCE · Nueva convocatoria';message:='Ya puedes confirmar tu asistencia al próximo partido.';
  else
   headline:='LAST DANCE · Cambio de partido';message:='Se han actualizado los datos del partido. Revisa la fecha, la hora o la pista.';
  end if;
  if f.status='scheduled' and f.match_time ~ '^[0-9]{2}:[0-9]{2}$' then
   due:=(f.match_date||' '||f.match_time)::timestamp at time zone 'Europe/Madrid';
  else
   due:=(f.match_date||' 23:59')::timestamp at time zone 'Europe/Madrid';
  end if;
  if due<=now() then continue;end if;
  for u in select a.user_id from private.team_accounts a join public.players p on p.id=a.player_id and p.active
   left join private.notification_settings s on s.user_id=a.user_id
   where (kind='changed' and coalesce(s.match_changes_push,true))
     or (kind='fixture' and coalesce(s.attendance_push,true)
      and not exists(select 1 from private.availability v where v.match_key=f.mk and v.player_id=a.player_id))
  loop
   perform private.attendance_enqueue(u.user_id,f.mk,kind,
    case when kind='fixture' then 'initial' else to_char(now() at time zone 'UTC','YYYYMMDDHH24MISS') end,
    headline,message,now());
  end loop;
 end loop;
end$$;
revoke all on function private.attendance_scan_fixtures() from public,anon,authenticated;
create or replace function public.attendance_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare j jsonb;v_status int;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Access denied';end if;
 if p_action='prepare' then
  perform private.attendance_scan_fixtures();
  -- Process official fixtures only. A postponed fixture without a valid time is excluded.
  v_status:=0;
  for j in
   select jsonb_build_object('mk',m->>'key','kickoff',(((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid'),
      'user_id',a.user_id,'reminders',coalesce(s.attendance_push,true),'activity',coalesce(s.attendance_activity_push,false)) as item
   from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches')m
   join private.team_accounts a on true join public.players p on p.id=a.player_id and p.active
   left join private.notification_settings s on s.user_id=a.user_id
   where (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE') and m->>'status'='scheduled'
     and m->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     and (((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid')>now()
     and not exists(select 1 from private.availability v where v.match_key=m->>'key' and v.player_id=a.player_id)
  loop
   v_status:=v_status+1;
   if (j->>'reminders')::boolean then
    if (j->>'kickoff')::timestamptz-now()<=interval '48 hours' and (j->>'kickoff')::timestamptz-now()>interval '24 hours' then
     perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','reminder48','48h','LAST DANCE · ¿Vienes al partido?','Faltan menos de 48 horas y todavía no has respondido. Confirma tu asistencia.',now());
    elsif (j->>'kickoff')::timestamptz-now()<=interval '24 hours' then
     perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','reminder24','24h','LAST DANCE · Último recordatorio','El partido se acerca. ¿Vienes, no vienes o tienes dudas?',now());
    end if;
   end if;
   if (j->>'activity')::boolean then
    if exists(select 1 from private.attendance_activity a where a.match_key=j->>'mk' and a.window_start=to_timestamp(floor(extract(epoch from now()-interval '30 minutes')/1800)*1800)) then
    perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','activity',
     to_char(to_timestamp(floor(extract(epoch from now()-interval '30 minutes')/1800)*1800) at time zone 'UTC','YYYYMMDDHH24MI'),
     'LAST DANCE · ¡El vestuario se mueve!',
     'Varios compañeros han actualizado su asistencia. ¡Falta tu respuesta!',
     now());
    end if;
   end if;
  end loop;
  return jsonb_build_object('prepared',v_status);
 elsif p_action='claim' then
  with picked as (
    select o.id from private.attendance_push_outbox o
    join private.attendance_notifications n on n.id=o.notification_id
    where not o.finished and o.available_at<=now() and (o.lease_until is null or o.lease_until<now()) and o.attempts<5
    and exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id and p.active where a.user_id=n.user_id
      and (n.kind='changed' or not exists(select 1 from private.availability v where v.match_key=n.match_key and v.player_id=a.player_id)))
    and exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches')m
      where m->>'key'=n.match_key and m->>'status'='scheduled'
      and (((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid')>now())
    and coalesce((select case when n.kind='activity' then attendance_activity_push when n.kind='changed' then match_changes_push else attendance_push end from private.notification_settings where user_id=n.user_id),n.kind<>'activity')
    order by o.available_at limit 50 for update of o skip locked
   ), claimed as (update private.attendance_push_outbox o set lease_until=now()+interval '2 minutes',attempts=o.attempts+1
    from picked where o.id=picked.id returning o.id,o.notification_id,o.subscription_id)
   select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) into j from (
    select c.id,n.match_key,n.title,n.body,s.endpoint,s.p256dh,s.auth
    from claimed c join private.attendance_notifications n on n.id=c.notification_id join private.push_subscriptions s on s.id=c.subscription_id
   )t;
  return j;
 elsif p_action='finish' then
  update private.attendance_push_outbox set finished=(p_payload->>'status')::int between 200 and 299
    or (p_payload->>'status')::int between 400 and 499 and (p_payload->>'status')::int not in (408,429),
    lease_until=null,available_at=now()+interval '1 minute'*power(2,least(attempts,5))
   where id=(p_payload->>'id')::uuid;
  if (p_payload->>'status')::int in (404,410) then
   delete from private.push_subscriptions where id=(select subscription_id from private.attendance_push_outbox where id=(p_payload->>'id')::uuid);
  end if;
  return '{"ok":true}'::jsonb;
 else raise exception 'Invalid action';end if;
end$$;

commit;