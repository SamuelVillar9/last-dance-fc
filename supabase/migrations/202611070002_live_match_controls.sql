begin;
create function public.live_control_match(p_match text,p_action text)
returns public.live_matches language plpgsql security definer set search_path='' as $$
declare v public.live_matches;v_exists boolean;
begin
 if auth.uid() is null or not private.live_can_control() then raise exception 'Sin permiso para controlar el partido';end if;
 select exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m
 where m->>'key'=p_match and (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE')) into v_exists;
 if not v_exists then raise exception 'Partido no encontrado';end if;
 insert into public.live_matches(match_key) values(p_match) on conflict do nothing;
 select * into v from public.live_matches where match_key=p_match for update;
 if p_action='start' and v.status='scheduled' then
 update public.live_matches set status='first_half',started_at=now(),period_started_at=now(),elapsed_seconds=0,revision=revision+1,updated_at=now() where match_key=p_match;
 elsif p_action='halftime' and v.status='first_half' then
 update public.live_matches set status='halftime',elapsed_seconds=least(7200,elapsed_seconds+greatest(0,extract(epoch from now()-period_started_at)::int)),period_started_at=null,revision=revision+1,updated_at=now() where match_key=p_match;
 elsif p_action='resume' and v.status='halftime' then
 update public.live_matches set status='second_half',period_started_at=now(),revision=revision+1,updated_at=now() where match_key=p_match;
 elsif p_action='finish' and v.status in ('first_half','halftime','second_half') then
 update public.live_matches set status='finished',elapsed_seconds=least(7200,elapsed_seconds+case when period_started_at is null then 0 else greatest(0,extract(epoch from now()-period_started_at)::int) end),period_started_at=null,finished_at=now(),revision=revision+1,updated_at=now() where match_key=p_match;
 else raise exception 'Transición de estado no permitida';end if;
 insert into public.live_events(match_key,client_request_id,kind,side,minute,period,actor_id)
 values(p_match,gen_random_uuid(),case when p_action='start' then 'kickoff' when p_action='finish' then 'final' else p_action end,'home',least(120,greatest(0,v.elapsed_seconds/60)),case when p_action in ('start','halftime') then 1 else 2 end,auth.uid());
 select * into v from public.live_matches where match_key=p_match;
 return v;
end;$$;
revoke all on function public.live_control_match(text,text) from public,anon;
grant execute on function public.live_control_match(text,text) to authenticated;

create function public.live_void_event(p_event uuid)
returns void language plpgsql security definer set search_path='' as $$
declare e public.live_events;v_uid uuid:=auth.uid();
begin
 if v_uid is null or not private.live_can_record() then raise exception 'Acceso denegado';end if;
 select * into e from public.live_events where id=p_event for update;
 if not found or e.voided_at is not null then raise exception 'Evento no disponible';end if;
 if e.actor_id<>v_uid and not public.is_admin() then raise exception 'Solo puedes corregir tus eventos';end if;
 perform 1 from public.live_matches where match_key=e.match_key and status in ('first_half','halftime','second_half') for update;
 if not found then raise exception 'Partido cerrado';end if;
 update public.live_events set voided_at=now() where id=p_event;
 if e.kind='goal' then
 update public.live_matches set home_goals=home_goals-case when e.side='home' then 1 else 0 end,
 away_goals=away_goals-case when e.side='away' then 1 else 0 end,revision=revision+1,updated_at=now() where match_key=e.match_key;
 else update public.live_matches set revision=revision+1,updated_at=now() where match_key=e.match_key;end if;
 insert into private.live_event_audit(event_id,match_key,actor_id,action,before_state)
 values(e.id,e.match_key,v_uid,'void',to_jsonb(e));
end;$$;
revoke all on function public.live_void_event(uuid) from public,anon;
grant execute on function public.live_void_event(uuid) to authenticated;
commit;
