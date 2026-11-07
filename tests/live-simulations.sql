-- Simulations must not be accessible to ordinary players, including live annotators.
do $$
begin
 if has_table_privilege('authenticated','private.live_simulations','SELECT') or has_table_privilege('authenticated','private.live_simulation_events','SELECT') then raise exception 'Simulation tables leaked';end if;
 if has_function_privilege('anon','public.live_simulation(text,uuid,jsonb)','EXECUTE') then raise exception 'Anonymous simulation RPC leaked';end if;
 if not has_function_privilege('authenticated','public.live_simulation(text,uuid,jsonb)','EXECUTE') then raise exception 'Admin RPC unavailable to authenticated';end if;
end $$;
insert into auth.users(id,email) values('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','sim-admin@test.invalid'),('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','sim-player@test.invalid');
insert into public.admins(user_id) values('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');
insert into public.players(id,name,number,active) values('sim-player','Prueba',98,true);
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',true);
do $$
begin
 perform public.live_simulation('list');
 raise exception 'Non-admin accessed simulations';
exception when insufficient_privilege then null;
end $$;
rollback;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
do $$
declare id uuid; data jsonb;
begin
 id:=(public.live_simulation('create',null,'{"opponent":"Rival ficticio"}'::jsonb)->>'id')::uuid;
 perform public.live_simulation('control',id,'{"transition":"start"}'::jsonb);
 perform public.live_simulation('record',id,'{"kind":"goal","side":"home","player_id":"sim-player","minute":1}'::jsonb);
 data:=public.live_simulation('get',id);
 if (data->'match'->>'home_goals')::integer<>1 then raise exception 'Goal not recorded';end if;
 perform public.live_simulation('reset',id);
 data:=public.live_simulation('get',id);
 if (data->'match'->>'home_goals')::integer<>0 or jsonb_array_length(data->'events')<>0 then raise exception 'Reset failed';end if;
 perform public.live_simulation('delete',id);
 if jsonb_array_length(public.live_simulation('list'))<>0 then raise exception 'Delete failed';end if;
end $$;
rollback;
