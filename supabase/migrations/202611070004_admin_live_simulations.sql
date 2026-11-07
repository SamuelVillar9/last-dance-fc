-- Admin-only live match simulations. Completely isolated from real fixtures, reports and push.
begin;
create table private.live_simulations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 opponent text not null default 'Rival de prueba',
 status text not null default 'scheduled' check(status in ('scheduled','first_half','halftime','second_half','finished')),
 period_started_at timestamptz,
 elapsed_seconds integer not null default 0 check(elapsed_seconds between 0 and 7200),
 home_goals integer not null default 0 check(home_goals>=0),
 away_goals integer not null default 0 check(away_goals>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table private.live_simulation_events (
 id uuid primary key default gen_random_uuid(),
 simulation_id uuid not null references private.live_simulations(id) on delete cascade,
 kind text not null check(kind in ('goal','yellow','red','second_yellow','kickoff','halftime','resume','final')),
 side text not null check(side in ('home','away')),
 player_id text references public.players(id),
 assist_player_id text references public.players(id),
 minute integer not null check(minute between 0 and 120),
 period integer not null check(period in (1,2)),
 voided_at timestamptz,
 created_at timestamptz not null default now(),
 check(kind='goal' or assist_player_id is null),
 check(assist_player_id is distinct from player_id or assist_player_id is null)
);
create index live_simulation_events_order on private.live_simulation_events(simulation_id,created_at);
alter table private.live_simulations enable row level security;
alter table private.live_simulation_events enable row level security;
revoke all on private.live_simulations,private.live_simulation_events from public,anon,authenticated;

-- This is the ONLY exposed entrypoint. No real match tables, outbox or reports are touched.
create function public.live_simulation(p_action text,p_id uuid default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.live_simulations; e private.live_simulation_events; v_id uuid; v_kind text;v_side text;v_player text;v_assist text;v_minute integer;v_period integer;v_opponent text;v_elapsed integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Solo el administrador puede acceder a simulaciones' using errcode='42501';end if;
 if p_action='list' then
   return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from private.live_simulations x where x.owner_id=auth.uid()),'[]'::jsonb);
 end if;
 if p_action='create' then
   v_opponent:=trim(coalesce(p_payload->>'opponent','Rival de prueba'));
   if length(v_opponent)<2 or length(v_opponent)>80 then raise exception 'Nombre del rival no válido';end if;
   insert into private.live_simulations(owner_id,opponent) values(auth.uid(),v_opponent) returning id into v_id;
   return jsonb_build_object('id',v_id);
 end if;
 if p_id is null then raise exception 'Selecciona una simulación';end if;
 select * into s from private.live_simulations where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Simulación no encontrada';end if;
 if p_action='get' then
   return jsonb_build_object('match',to_jsonb(s),'events',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from private.live_simulation_events x where x.simulation_id=p_id),'[]'::jsonb));
 elsif p_action='delete' then
   delete from private.live_simulations where id=p_id;
   return jsonb_build_object('deleted',true);
 elsif p_action='reset' then
   delete from private.live_simulation_events where simulation_id=p_id;
   update private.live_simulations set status='scheduled',period_started_at=null,elapsed_seconds=0,home_goals=0,away_goals=0,updated_at=now() where id=p_id;
   return jsonb_build_object('reset',true);
 elsif p_action='control' then
   v_kind:=p_payload->>'transition';
   if v_kind='start' and s.status='scheduled' then
     update private.live_simulations set status='first_half',period_started_at=now(),elapsed_seconds=0,updated_at=now() where id=p_id;
     v_kind:='kickoff';
   elsif v_kind='halftime' and s.status='first_half' then
     update private.live_simulations set status='halftime',elapsed_seconds=least(7200,s.elapsed_seconds+greatest(0,extract(epoch from now()-s.period_started_at)::integer)),period_started_at=null,updated_at=now() where id=p_id;
   elsif v_kind='resume' and s.status='halftime' then
     update private.live_simulations set status='second_half',period_started_at=now(),updated_at=now() where id=p_id;
   elsif v_kind='finish' and s.status in ('first_half','halftime','second_half') then
     update private.live_simulations set status='finished',elapsed_seconds=least(7200,s.elapsed_seconds+case when s.period_started_at is null then 0 else greatest(0,extract(epoch from now()-s.period_started_at)::integer) end),period_started_at=null,updated_at=now() where id=p_id;
     v_kind:='final';
   else raise exception 'Transición no permitida';end if;
   insert into private.live_simulation_events(simulation_id,kind,side,minute,period)
   values(p_id,v_kind,'home',least(120,s.elapsed_seconds/60),case when v_kind in ('kickoff','halftime') then 1 else 2 end);
   return jsonb_build_object('ok',true);
 elsif p_action='advance' then
   if s.status not in ('first_half','second_half') then raise exception 'El reloj no está en marcha';end if;
   v_elapsed:=coalesce((p_payload->>'seconds')::integer,60);
   if v_elapsed not in (60,300,600) then raise exception 'Avance no permitido';end if;
   update private.live_simulations set elapsed_seconds=least(7200,s.elapsed_seconds+v_elapsed+greatest(0,extract(epoch from now()-s.period_started_at)::integer)),period_started_at=now(),updated_at=now() where id=p_id;
   return jsonb_build_object('ok',true);
 elsif p_action='record' then
   if s.status not in ('first_half','second_half') then raise exception 'La simulación no está en juego';end if;
   v_kind:=p_payload->>'kind';v_side:=p_payload->>'side';
   v_player:=nullif(p_payload->>'player_id','');v_assist:=nullif(p_payload->>'assist_player_id','');
   v_minute:=coalesce((p_payload->>'minute')::integer,0);v_period:=case when s.status='first_half' then 1 else 2 end;
   if v_kind is null or v_kind not in ('goal','yellow','red','second_yellow') or v_side is null or v_side not in ('home','away') or v_minute not between 0 and 120 then raise exception 'Evento no válido';end if;
   if v_side='away' and (v_player is not null or v_assist is not null) then raise exception 'No se pueden asignar jugadores propios al rival';end if;
   if v_player is not null and not exists(select 1 from public.players where id=v_player and active) then raise exception 'Jugador no válido';end if;
   if v_assist is not null and (v_kind<>'goal' or v_player is null or v_player=v_assist or not exists(select 1 from public.players where id=v_assist and active)) then raise exception 'Asistencia no válida';end if;
   insert into private.live_simulation_events(simulation_id,kind,side,player_id,assist_player_id,minute,period)
   values(p_id,v_kind,v_side,v_player,v_assist,v_minute,v_period);
   if v_kind='goal' then update private.live_simulations set home_goals=home_goals+case when v_side='home' then 1 else 0 end,away_goals=away_goals+case when v_side='away' then 1 else 0 end,updated_at=now() where id=p_id;end if;
   return jsonb_build_object('ok',true);
 elsif p_action='void' then
   select * into e from private.live_simulation_events where id=(p_payload->>'event_id')::uuid and simulation_id=p_id and voided_at is null and kind in ('goal','yellow','red','second_yellow') for update;
   if not found then raise exception 'Evento no disponible';end if;
   update private.live_simulation_events set voided_at=now() where id=e.id;
   if e.kind='goal' then update private.live_simulations set home_goals=home_goals-case when e.side='home' then 1 else 0 end,away_goals=away_goals-case when e.side='away' then 1 else 0 end,updated_at=now() where id=p_id;end if;
   return jsonb_build_object('ok',true);
 end if;
 raise exception 'Acción no reconocida';
end;$$;
revoke all on function public.live_simulation(text,uuid,jsonb) from public,anon;
grant execute on function public.live_simulation(text,uuid,jsonb) to authenticated;
commit;
