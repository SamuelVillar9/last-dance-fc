begin;
insert into auth.users(id,email,created_at,last_sign_in_at) values
 ('90000000-0000-0000-0000-000000000001','activity-admin@test.invalid',now(),now()),
 ('90000000-0000-0000-0000-000000000002','activity-player@test.invalid',now(),now()),
 ('90000000-0000-0000-0000-000000000003','activity-unlinked@test.invalid',now(),null);
insert into public.admins(user_id) values('90000000-0000-0000-0000-000000000001');
insert into private.team_accounts(user_id,player_id) values('90000000-0000-0000-0000-000000000002','player-1');
set local role anon;
do $$ begin
 begin perform public.admin_user_activity(); raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null;end;
 begin perform public.record_activity(); raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select public.record_activity();
select public.record_activity();
do $$ begin
 begin perform public.admin_user_activity(); raise exception 'Player read allowed'; exception when insufficient_privilege then null;end;
 begin perform private.admin_user_activity(); raise exception 'Direct private read allowed'; exception when insufficient_privilege then null;end;
 begin perform 1 from private.user_activity; raise exception 'Direct table read allowed'; exception when insufficient_privilege then null;end;
 begin update private.user_activity set last_seen_at=now(); raise exception 'Direct table write allowed'; exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.user_activity where user_id='90000000-0000-0000-0000-000000000002')<>1 then raise exception 'Own activity missing';end if;
end $$;
-- Freeze an earlier timestamp: repeated calls inside five minutes must preserve it.
update private.user_activity set last_seen_at=now()-interval '2 minutes' where user_id='90000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.record_activity();
reset role;
do $$ begin
 if (select last_seen_at from private.user_activity where user_id='90000000-0000-0000-0000-000000000002')<>now()-interval '2 minutes' then raise exception 'Throttle failed';end if;
end $$;
update private.user_activity set last_seen_at=now()-interval '6 minutes' where user_id='90000000-0000-0000-0000-000000000002';
set local role authenticated;
select public.record_activity();
reset role;
do $$ begin
 if (select last_seen_at from private.user_activity where user_id='90000000-0000-0000-0000-000000000002')<>now() then raise exception 'Activity not refreshed';end if;
end $$;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare users jsonb;begin
 users:=public.admin_user_activity();
 if not exists(select 1 from jsonb_array_elements(users) u where u->>'email'='activity-unlinked@test.invalid' and u->>'player_id' is null and u->>'last_sign_in_at' is null) then raise exception 'Unlinked account missing';end if;
 if not exists(select 1 from jsonb_array_elements(users) u where u->>'email'='activity-player@test.invalid' and u->>'player_id'='player-1' and u->>'last_seen_at' is not null) then raise exception 'Player activity missing';end if;
end $$;
reset role;
-- Removing administrator access immediately denies subsequent calls.
delete from public.admins where user_id='90000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 begin perform public.admin_user_activity(); raise exception 'Revoked admin read allowed'; exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
