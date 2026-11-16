begin;
alter table private.notification_settings
 add column if not exists attendance_push boolean not null default true,
 add column if not exists attendance_activity_push boolean not null default false,
 add column if not exists match_changes_push boolean not null default true;

create table if not exists private.attendance_notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 match_key text not null,
 kind text not null check(kind in ('fixture','activity','reminder48','reminder24','changed')),
 window_key text not null,
 title text not null,
 body text not null,
 available_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(user_id,match_key,kind,window_key)
);
create index if not exists attendance_notices_user on private.attendance_notifications(user_id,created_at desc);
create table if not exists private.attendance_push_outbox(
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references private.attendance_notifications(id) on delete cascade,
 subscription_id uuid not null references private.push_subscriptions(id) on delete cascade,
 available_at timestamptz not null default now(),
 attempts int not null default 0,
 lease_until timestamptz,
 finished boolean not null default false,
 unique(notification_id,subscription_id)
);
create index if not exists attendance_outbox_pending on private.attendance_push_outbox(available_at) where not finished;
create table if not exists private.attendance_activity(
 match_key text not null,
 player_id text not null references public.players(id) on delete cascade,
 window_start timestamptz not null,
 updated_at timestamptz not null default now(),
 primary key(match_key,player_id,window_start)
);
create table if not exists private.attendance_reminder_runs(
 match_key text not null,
 kind text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(match_key,kind,user_id)
);
do $$declare t text;begin
 foreach t in array array['attendance_notifications','attendance_push_outbox','attendance_activity','attendance_reminder_runs'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
end$$;

create or replace function private.attendance_local_time(p timestamptz) returns timestamptz
language sql stable set search_path='' as $$
 select case when (p at time zone 'Europe/Madrid')::time >= time '23:00' then
 ((p at time zone 'Europe/Madrid')::date+1+time '09:00') at time zone 'Europe/Madrid'
 when (p at time zone 'Europe/Madrid')::time < time '09:00' then
 ((p at time zone 'Europe/Madrid')::date+time '09:00') at time zone 'Europe/Madrid'
 else p end
$$;
revoke all on function private.attendance_local_time(timestamptz) from public,anon,authenticated;

create or replace function private.attendance_enqueue(p_user uuid,p_match text,p_kind text,p_window text,p_title text,p_body text,p_due timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare nid uuid;begin
 insert into private.attendance_notifications(user_id,match_key,kind,window_key,title,body,available_at)
 values(p_user,p_match,p_kind,p_window,p_title,p_body,private.attendance_local_time(p_due))
 on conflict(user_id,match_key,kind,window_key) do nothing returning id into nid;
 if nid is not null then
 insert into private.attendance_push_outbox(notification_id,subscription_id,available_at)
 select nid,s.id,private.attendance_local_time(p_due) from private.push_subscriptions s where s.user_id=p_user on conflict do nothing;
 end if;
end$$;
revoke all on function private.attendance_enqueue(uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;

create or replace function private.attendance_track() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.status is distinct from new.status then
 insert into private.attendance_activity(match_key,player_id,window_start)
 values(new.match_key,new.player_id,to_timestamp(floor(extract(epoch from now())/1800)*1800))
 on conflict(match_key,player_id,window_start) do update set updated_at=now();
 end if;
 return new;
end$$;
drop trigger if exists attendance_track_change on private.availability;
create trigger attendance_track_change after insert or update of status on private.availability for each row execute function private.attendance_track();

create or replace function public.attendance_notices(p_action text default 'list',p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;
begin
 if uid is null or not exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id and p.active where a.user_id=uid) then raise exception 'Cuenta de jugador requerida';end if;
 if p_action='settings' then
  insert into private.notification_settings(user_id,attendance_push,attendance_activity_push,match_changes_push)
  values(uid,coalesce((p_payload->>'attendance_push')::boolean,true),coalesce((p_payload->>'attendance_activity_push')::boolean,false),coalesce((p_payload->>'match_changes_push')::boolean,true))
  on conflict(user_id) do update set
   attendance_push=coalesce((p_payload->>'attendance_push')::boolean,private.notification_settings.attendance_push),
   attendance_activity_push=coalesce((p_payload->>'attendance_activity_push')::boolean,private.notification_settings.attendance_activity_push),
   match_changes_push=coalesce((p_payload->>'match_changes_push')::boolean,private.notification_settings.match_changes_push);
 elsif p_action='read' then
  update private.attendance_notifications set read_at=now() where user_id=uid and read_at is null and
  (p_payload->>'id' is null or id=(p_payload->>'id')::uuid);
 elsif p_action<>'list' then raise exception 'Acción no válida';end if;
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(x order by x.created_at desc) from
   (select id,match_key,kind,title,body,created_at,read_at from private.attendance_notifications where user_id=uid order by created_at desc limit 40)x),'[]'::jsonb),
  'unread',(select count(*) from private.attendance_notifications where user_id=uid and read_at is null),
  'attendance_push',coalesce((select attendance_push from private.notification_settings where user_id=uid),true),
  'attendance_activity_push',coalesce((select attendance_activity_push from private.notification_settings where user_id=uid),false),
  'match_changes_push',coalesce((select match_changes_push from private.notification_settings where user_id=uid),true)
 ) into result;
 return result;
end$$;
revoke all on function public.attendance_notices(text,jsonb) from public,anon;
grant execute on function public.attendance_notices(text,jsonb) to authenticated;

create or replace function public.attendance_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare j jsonb;v_status int;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Access denied';end if;
 if p_action='prepare' then
  -- Process official fixtures only. A postponed fixture without a valid time is excluded.
  v_status:=0;
  for j in
   select jsonb_build_object('mk',m->>'key','kickoff',(((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid'),
      'user_id',a.user_id,'reminders',coalesce(s.attendance_push,true),'activity',coalesce(s.attendance_activity_push,false)) as item
   from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches')m
   join private.team_accounts a on true join public.players p on p.id=a.player_id and p.active
   left join private.notification_settings s on s.user_id=a.user_id
   where (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE') and m->>'status'='scheduled'
     and m->>'date' ~ '^\\d{4}-\\d{2}-\\d{2}$'
     and (((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid')>now()
     and not exists(select 1 from private.availability v where v.match_key=m->>'key' and v.player_id=a.player_id)
  loop
   j:=j->'item';v_status:=v_status+1;
   if (j->>'reminders')::boolean then
    if (j->>'kickoff')::timestamptz-now()<=interval '48 hours' and (j->>'kickoff')::timestamptz-now()>interval '24 hours' then
     perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','reminder48','48h','LAST DANCE · ¿Vienes al partido?','Faltan menos de 48 horas y todavía no has respondido. Confirma tu asistencia.',now());
    elsif (j->>'kickoff')::timestamptz-now()<=interval '24 hours' then
     perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','reminder24','24h','LAST DANCE · Último recordatorio','El partido se acerca. ¿Vienes, no vienes o tienes dudas?',now());
    end if;
   end if;
   if (j->>'activity')::boolean then
    perform private.attendance_enqueue((j->>'user_id')::uuid,j->>'mk','activity',
     to_char(to_timestamp(floor(extract(epoch from now()-interval '30 minutes')/1800)*1800) at time zone 'UTC','YYYYMMDDHH24MI'),
     'LAST DANCE · ¡El vestuario se mueve!',
     'Varios compañeros han actualizado su asistencia. ¡Falta tu respuesta!',
     now())
    where exists(select 1 from private.attendance_activity a where a.match_key=j->>'mk'
      and a.window_start=to_timestamp(floor(extract(epoch from now()-interval '30 minutes')/1800)*1800));
   end if;
  end loop;
  return jsonb_build_object('prepared',v_status);
 elsif p_action='claim' then
  return (select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) from (
   with picked as (
    select o.id from private.attendance_push_outbox o
    join private.attendance_notifications n on n.id=o.notification_id
    where not o.finished and o.available_at<=now() and (o.lease_until is null or o.lease_until<now()) and o.attempts<5
    and exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id and p.active where a.user_id=n.user_id
      and not exists(select 1 from private.availability v where v.match_key=n.match_key and v.player_id=a.player_id))
    and exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches')m
      where m->>'key'=n.match_key and m->>'status'='scheduled'
      and (((m->>'date')||' '||coalesce(nullif(m->>'time',''),'00:00'))::timestamp at time zone 'Europe/Madrid')>now())
    and coalesce((select case when n.kind='activity' then attendance_activity_push else attendance_push end from private.notification_settings where user_id=n.user_id),n.kind<>'activity')
    order by o.available_at limit 50 for update of o skip locked
   ), claimed as (update private.attendance_push_outbox o set lease_until=now()+interval '2 minutes',attempts=o.attempts+1
    from picked where o.id=picked.id returning o.id,o.notification_id,o.subscription_id)
   select c.id,n.match_key,n.title,n.body,s.endpoint,s.p256dh,s.auth
   from claimed c join private.attendance_notifications n on n.id=c.notification_id join private.push_subscriptions s on s.id=c.subscription_id
  )t);
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
revoke all on function public.attendance_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function public.attendance_dispatch(text,jsonb) to service_role;
commit;