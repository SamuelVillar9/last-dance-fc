-- Partido en directo: base transaccional, permisos y eventos.
-- No modifica actas oficiales ni resultados importados.
begin;
create table public.live_matches (
 match_key text primary key,
 status text not null default 'scheduled' check(status in ('scheduled','first_half','halftime','second_half','finished')),
 period_started_at timestamptz,
 elapsed_seconds integer not null default 0 check(elapsed_seconds between 0 and 7200),
 home_goals integer not null default 0 check(home_goals>=0),
 away_goals integer not null default 0 check(away_goals>=0),
 revision bigint not null default 0,
 started_at timestamptz,
 finished_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.live_permissions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 can_record boolean not null default false,
 can_control boolean not null default false,
 granted_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
create table public.live_events (
 id uuid primary key default gen_random_uuid(),
 match_key text not null references public.live_matches(match_key) on delete cascade,
 client_request_id uuid not null,
 kind text not null check(kind in ('goal','yellow','red','second_yellow','kickoff','halftime','resume','final')),
 side text not null check(side in ('home','away')),
 player_id text references public.players(id),
 assist_player_id text references public.players(id),
 minute integer not null check(minute between 0 and 120),
 period integer not null check(period in (1,2)),
 actor_id uuid not null references auth.users(id),
 voided_at timestamptz,
 created_at timestamptz not null default now(),
 unique(match_key,actor_id,client_request_id),
 check(kind='goal' or assist_player_id is null),
 check(assist_player_id is null or assist_player_id is distinct from player_id)
);
create index live_events_match on public.live_events(match_key,created_at);
create table private.live_event_audit (
 id bigint generated always as identity primary key,
 event_id uuid references public.live_events(id),
 match_key text not null,
 actor_id uuid references auth.users(id),
 action text not null,
 before_state jsonb,
 after_state jsonb,
 created_at timestamptz not null default now()
);
create table private.live_push_outbox (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.live_events(id) on delete cascade,
 subscription_id uuid not null references private.push_subscriptions(id) on delete cascade,
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 finished boolean not null default false,
 unique(event_id,subscription_id)
);
create index live_push_pending on private.live_push_outbox(available_at) where not finished;
alter table public.live_matches enable row level security;
alter table public.live_permissions enable row level security;
alter table public.live_events enable row level security;
alter table private.live_event_audit enable row level security;
alter table private.live_push_outbox enable row level security;
revoke all on public.live_permissions,private.live_event_audit,private.live_push_outbox from public,anon,authenticated;
grant select on public.live_matches,public.live_events to anon,authenticated;
create policy live_matches_read on public.live_matches for select to anon,authenticated using(true);
create policy live_events_read on public.live_events for select to anon,authenticated using(true);
-- Mutations are performed exclusively through authenticated RPCs.
create function private.live_can_record() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or exists (
 select 1 from public.live_permissions lp join private.team_accounts ta on ta.user_id=lp.user_id
 join public.players p on p.id=ta.player_id
 where lp.user_id=auth.uid() and lp.can_record and p.active);
$$;
create function private.live_can_control() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or exists (
 select 1 from public.live_permissions lp join private.team_accounts ta on ta.user_id=lp.user_id
 join public.players p on p.id=ta.player_id
 where lp.user_id=auth.uid() and lp.can_control and p.active);
$$;
revoke all on function private.live_can_record(),private.live_can_control() from public,anon,authenticated;
create function public.live_set_permission(p_user uuid,p_record boolean,p_control boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Acceso denegado'; end if;
 if not exists(select 1 from private.team_accounts ta join public.players p on p.id=ta.player_id where ta.user_id=p_user and p.active) then
 raise exception 'El usuario debe pertenecer a la plantilla activa'; end if;
 insert into public.live_permissions(user_id,can_record,can_control,granted_by)
 values(p_user,p_record,p_control,auth.uid())
 on conflict(user_id) do update set can_record=excluded.can_record,can_control=excluded.can_control,granted_by=excluded.granted_by,updated_at=now();
end;$$;
revoke all on function public.live_set_permission(uuid,boolean,boolean) from public,anon;
grant execute on function public.live_set_permission(uuid,boolean,boolean) to authenticated;
create function public.live_record_event(p_match text,p_request uuid,p_kind text,p_side text,p_player text,p_assist text,p_minute integer,p_period integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_event uuid;v_status text;v_actor uuid:=auth.uid();v_own_side text;
begin
 if v_actor is null or not private.live_can_record() then raise exception 'No tienes permisos para anotar';end if;
 if p_kind not in ('goal','yellow','red','second_yellow') or p_side not in ('home','away') or p_minute not between 0 and 120 or p_period not in (1,2) then raise exception 'Evento no válido';end if;
 select status into v_status from public.live_matches where match_key=p_match for update;
 if v_status is null or v_status not in ('first_half','second_half') then raise exception 'El partido no está en juego';end if;
 if (v_status='first_half' and p_period<>1) or (v_status='second_half' and p_period<>2) then raise exception 'Periodo incorrecto';end if;
 if p_player is not null and not exists(select 1 from public.players where id=p_player and active) then raise exception 'Jugador no válido';end if;
 if p_assist is not null and (p_kind<>'goal' or p_player=p_assist or not exists(select 1 from public.players where id=p_assist and active)) then raise exception 'Asistencia no válida';end if;
 -- The side of Last Dance is derived from the imported fixture, never trusted from the client.
 select case when m->>'home'='LAST DANCE' then 'home' else 'away' end into v_own_side
 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m
 where m->>'key'=p_match and (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE') limit 1;
 if v_own_side is null then raise exception 'Partido ajeno al equipo';end if;
 if p_player is not null and p_side<>v_own_side then raise exception 'No se identifican jugadores rivales';end if;
 if p_assist is not null and p_side<>v_own_side then raise exception 'Asistencia no válida';end if;
 insert into public.live_events(match_key,client_request_id,kind,side,player_id,assist_player_id,minute,period,actor_id)
 values(p_match,p_request,p_kind,p_side,p_player,p_assist,p_minute,p_period,v_actor)
 on conflict(match_key,actor_id,client_request_id) do nothing returning id into v_event;
 if v_event is null then
 select id into v_event from public.live_events where match_key=p_match and actor_id=v_actor and client_request_id=p_request;
 return v_event;
 end if;
 if p_kind='goal' then
 update public.live_matches set home_goals=home_goals+case when p_side='home' then 1 else 0 end,
 away_goals=away_goals+case when p_side='away' then 1 else 0 end,revision=revision+1,updated_at=now() where match_key=p_match;
 else update public.live_matches set revision=revision+1,updated_at=now() where match_key=p_match;end if;
 insert into private.live_event_audit(event_id,match_key,actor_id,action) values(v_event,p_match,v_actor,'create');
 -- Outbox is durable. Dispatch worker must be deployed before push notifications are enabled.
 insert into private.live_push_outbox(event_id,subscription_id)
 select v_event,s.id from private.push_subscriptions s join private.team_accounts a on a.user_id=s.user_id
 join public.players p on p.id=a.player_id and p.active
 on conflict do nothing;
 return v_event;
end;$$;
revoke all on function public.live_record_event(text,uuid,text,text,text,text,integer,integer) from public,anon;
grant execute on function public.live_record_event(text,uuid,text,text,text,text,integer,integer) to authenticated;
commit;
