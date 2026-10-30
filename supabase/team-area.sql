begin;
-- Team identities and ballots are never exposed through the Data API.
create table private.team_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 player_id text not null unique references public.players(id) on delete cascade
);
create table private.availability(
 match_key text not null, player_id text not null references public.players(id) on delete cascade,
 status text not null check(status in ('yes','no','maybe')), updated_at timestamptz not null default now(),
 primary key(match_key,player_id)
);
create table private.mvp_rounds(
 match_key text primary key references public.published_reports(match_key) on delete cascade,
 opens_at timestamptz not null default now(), closes_at timestamptz not null default now()+interval '48 hours'
);
create table private.mvp_votes(
 match_key text not null references private.mvp_rounds(match_key) on delete cascade,
 voter_id text not null references public.players(id), candidate_id text not null references public.players(id),
 primary key(match_key,voter_id), check(voter_id<>candidate_id)
);
alter table private.team_accounts enable row level security;
alter table private.availability enable row level security;
alter table private.mvp_rounds enable row level security;
alter table private.mvp_votes enable row level security;
revoke all on private.team_accounts,private.availability,private.mvp_rounds,private.mvp_votes from public,anon,authenticated;
create function private.report_voting() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.mvp_rounds(match_key) values(new.match_key) on conflict do nothing;
 delete from private.mvp_votes v where v.match_key=new.match_key and
 (not exists(select 1 from jsonb_array_elements(new.entries)e where e->>'playerId'=v.voter_id)
 or not exists(select 1 from jsonb_array_elements(new.entries)e where e->>'playerId'=v.candidate_id));
 return new;
end; $$;
revoke all on function private.report_voting() from public,anon,authenticated;
create trigger report_voting after insert or update on public.published_reports for each row execute function private.report_voting();
-- Existing reports start with a fresh 48-hour window when the feature is installed.
insert into private.mvp_rounds(match_key) select match_key from public.published_reports;

create function private.team_portal(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); admin boolean; pid text; mk text:=p_payload->>'match_key'; candidate text:=p_payload->>'candidate_id';
 target uuid; report public.published_reports; round private.mvp_rounds; fixture jsonb; result jsonb;
begin
 if uid is null then raise exception 'Inicia sesión para entrar al vestuario'; end if;
 select exists(select 1 from public.admins where user_id=uid) into admin;
 select a.player_id into pid from private.team_accounts a join public.players p on p.id=a.player_id where a.user_id=uid and p.active;
 if p_action in ('link','unlink') then
  if not admin then raise exception 'Solo el administrador puede vincular cuentas'; end if;
  if p_action='link' then
   select id into target from auth.users where lower(email)=lower(trim(p_payload->>'email')) and email_confirmed_at is not null;
   if target is null then raise exception 'No hay una cuenta con ese correo confirmado. El jugador debe registrarse y confirmar su correo o crearse desde Supabase Auth'; end if;
   if not exists(select 1 from public.players where id=p_payload->>'player_id' and active) then raise exception 'Jugador no válido';end if;
   -- A unique identity per player. Never silently replace someone else's link.
   insert into private.team_accounts(user_id,player_id) values(target,p_payload->>'player_id')
   on conflict(user_id) do update set player_id=excluded.player_id;
  else
   delete from private.team_accounts where player_id=p_payload->>'player_id';
  end if;
 elsif p_action='availability' then
  if pid is null and not admin then raise exception 'Tu cuenta todavía no está vinculada a un jugador activo';end if;
  if admin and p_payload ? 'player_id' then pid:=p_payload->>'player_id'; end if;
  if pid is null or not exists(select 1 from public.players where id=pid and active) then raise exception 'Jugador no válido';end if;
  if coalesce(p_payload->>'status','') not in ('yes','no','maybe') then raise exception 'Respuesta no válida';end if;
  select m into fixture from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches')m
   where m->>'key'=mk and (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE') limit 1;
  if fixture is null or fixture->>'status' not in ('scheduled','postponed') then raise exception 'La disponibilidad está cerrada para este partido';end if;
  if fixture->>'date' is not null and ((fixture->>'date')||' '||coalesce(fixture->>'time','00:00'))::timestamp at time zone 'Europe/Madrid' <= now()
   then raise exception 'El partido ya ha empezado';end if;
  insert into private.availability(match_key,player_id,status) values(mk,pid,p_payload->>'status')
   on conflict(match_key,player_id) do update set status=excluded.status,updated_at=now();
 elsif p_action='vote' then
  if pid is null then raise exception 'Tu cuenta debe estar vinculada a un jugador activo';end if;
  select * into report from public.published_reports where match_key=mk for share;
  select * into round from private.mvp_rounds where match_key=mk;
  if report.match_key is null or round.match_key is null or now()<round.opens_at or now()>=round.closes_at then raise exception 'La votación no está abierta';end if;
  if candidate is null or candidate=pid then raise exception 'Elige a un compañero; no se permite el autovoto';end if;
  if not exists(select 1 from jsonb_array_elements(report.entries)e where e->>'playerId'=pid)
   or not exists(select 1 from jsonb_array_elements(report.entries)e where e->>'playerId'=candidate) then raise exception 'Solo los asistentes del acta pueden votar y recibir votos';end if;
  insert into private.mvp_votes(match_key,voter_id,candidate_id) values(mk,pid,candidate)
   on conflict(match_key,voter_id) do update set candidate_id=excluded.candidate_id;
 elsif p_action<>'dashboard' then raise exception 'Operación no válida';
 end if;
 -- Reload the actual identity after administrator overrides.
 select a.player_id into pid from private.team_accounts a join public.players p on p.id=a.player_id where a.user_id=uid and p.active;
 if pid is null and not admin then return jsonb_build_object('pending',true);end if;
 select jsonb_build_object(
  'pending',false,'admin',admin,'playerId',pid,
  'availability',coalesce((select jsonb_agg(jsonb_build_object('match_key',a.match_key,'player_id',a.player_id,'status',a.status)) from private.availability a),'[]'::jsonb),
  'rounds',coalesce((select jsonb_agg(jsonb_build_object('match_key',r.match_key,'opens_at',r.opens_at,'closes_at',r.closes_at,
   'my_vote',(select v.candidate_id from private.mvp_votes v where v.match_key=r.match_key and v.voter_id=pid),
   'voters',coalesce((select jsonb_agg(v.voter_id) from private.mvp_votes v where v.match_key=r.match_key),'[]'::jsonb)))
   from private.mvp_rounds r),'[]'::jsonb),
  'accounts',case when admin then coalesce((select jsonb_agg(jsonb_build_object('player_id',a.player_id,'email',u.email)) from private.team_accounts a join auth.users u on u.id=a.user_id),'[]'::jsonb) else '[]'::jsonb end
 ) into result;
 return result;
end; $$;
revoke all on function private.team_portal(text,jsonb) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.team_portal(text,jsonb) to authenticated;
create function public.team_portal(p_action text default 'dashboard',p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select private.team_portal(p_action,p_payload); $$;
revoke all on function public.team_portal(text,jsonb) from public,anon;
grant execute on function public.team_portal(text,jsonb) to authenticated;

-- Only aggregate results from CLOSED ballots are public; never expose individual votes.
create function private.mvp_results() returns jsonb language sql stable security definer set search_path='' as $$
 with counts as (
  select v.match_key,v.candidate_id player_id,count(*)::int votes
  from private.mvp_votes v join private.mvp_rounds r using(match_key)
  where r.closes_at<=now() group by v.match_key,v.candidate_id
 ), ranked as (
  select *,max(votes) over(partition by match_key) highest from counts
 )
 select coalesce(jsonb_agg(jsonb_build_object('match_key',match_key,'player_id',player_id,'votes',votes,'winner',votes=highest)),'[]'::jsonb) from ranked;
$$;
revoke all on function private.mvp_results() from public;
grant usage on schema private to anon;
grant execute on function private.mvp_results() to anon,authenticated;
create function public.mvp_results() returns jsonb language sql stable security invoker set search_path='' as $$ select private.mvp_results(); $$;
revoke all on function public.mvp_results() from public;
grant execute on function public.mvp_results() to anon,authenticated;
commit;
