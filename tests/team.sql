begin;
create schema test;
grant usage on schema test to anon,authenticated;
create function test.assert(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERT: %',message;end if;end$$;
create function test.denied(command text) returns void language plpgsql as $$begin
 begin execute command; exception when others then return;end;
 raise exception 'Expected denial: %',command;
end$$;
grant execute on all functions in schema test to anon,authenticated;
insert into auth.users values
 ('00000000-0000-0000-0000-000000000001','admin@test.invalid',now()),
 ('00000000-0000-0000-0000-000000000002','one@test.invalid',now()),
 ('00000000-0000-0000-0000-000000000003','two@test.invalid',now()),
 ('00000000-0000-0000-0000-000000000004','outsider@test.invalid',now());
insert into public.admins values('00000000-0000-0000-0000-000000000001');
insert into public.league_snapshots(id,data) values('test',jsonb_build_object('matches',jsonb_build_array(
 jsonb_build_object('key','test:played','home','LAST DANCE','away','OTHER','status','played'),
 jsonb_build_object('key','test:next','home','LAST DANCE','away','OTHER','status','scheduled','date',(current_date+365)::text,'time','12:00'),
 jsonb_build_object('key','test:past','home','LAST DANCE','away','OTHER','status','scheduled','date',(current_date-1)::text,'time','12:00'),
 jsonb_build_object('key','test:rival','home','RIVAL','away','OTHER','status','scheduled')
)));
insert into public.published_reports(match_key,entries) values('test:played',
 '[{"playerId":"player-1","goals":0,"assists":0,"yellow":0,"red":0},{"playerId":"player-2","goals":0,"assists":0,"yellow":0,"red":0}]');
set local role anon;
select test.denied($q$select public.team_portal()$q$);
select test.denied($q$select * from private.mvp_votes$q$);
select test.assert(public.mvp_results()='[]'::jsonb,'open ballots hidden from public');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.team_portal('link','{"email":"one@test.invalid","player_id":"player-1"}');
select public.team_portal('link','{"email":"two@test.invalid","player_id":"player-2"}');
select test.denied($q$select public.team_portal('link','{"email":"outsider@test.invalid","player_id":"player-1"}')$q$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
select test.assert((public.team_portal()->>'pending')::boolean,'unlinked account blocked');
select test.denied($q$select public.team_portal('availability','{"match_key":"test:next","status":"yes"}')$q$);
select test.denied($q$select public.team_portal('vote','{"match_key":"test:played","candidate_id":"player-1"}')$q$);
select test.denied($q$select public.team_portal('link','{"email":"outsider@test.invalid","player_id":"player-3"}')$q$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.team_portal('availability','{"match_key":"test:next","status":"yes","player_id":"player-2"}');
select test.assert(public.team_portal()->'accounts'='[]'::jsonb,'account emails hidden');
select test.denied($q$select public.team_portal('availability','{"match_key":"test:played","status":"yes"}')$q$);
select test.denied($q$select public.team_portal('availability','{"match_key":"test:past","status":"yes"}')$q$);
select test.denied($q$select public.team_portal('availability','{"match_key":"test:rival","status":"yes"}')$q$);
select test.denied($q$select public.team_portal('availability','{"match_key":"missing","status":"yes"}')$q$);
select test.denied($q$select public.team_portal('availability','{"match_key":"test:next","status":"wrong"}')$q$);
select test.denied($q$select public.team_portal('vote','{"match_key":"test:played","candidate_id":"player-1"}')$q$);
select test.denied($q$select public.team_portal('vote','{"match_key":"test:played","candidate_id":"player-3"}')$q$);
select public.team_portal('vote','{"match_key":"test:played","candidate_id":"player-2"}');
select public.team_portal('vote','{"match_key":"test:played","candidate_id":"player-2"}');
select test.assert(public.team_portal()->'rounds'->0->>'my_vote'='player-2','own vote visible');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select test.assert(public.team_portal()->'rounds'->0->'my_vote'='null'::jsonb,'others vote hidden');
select public.team_portal('vote','{"match_key":"test:played","candidate_id":"player-1"}');
select test.denied($q$select * from private.team_accounts$q$);
select test.denied($q$select * from private.mvp_votes$q$);
select test.denied($q$update private.mvp_rounds set closes_at=now()$q$);
reset role;
select test.assert((select count(*) from private.mvp_votes)=2,'one ballot per participant');
select test.assert((select player_id from private.availability where match_key='test:next')='player-1','cannot spoof availability owner');
-- A report edit never restarts the deadline, and removes ballots with invalid attendance.
update public.published_reports set note='Correction' where match_key='test:played';
select test.assert((select closes_at-opens_at from private.mvp_rounds where match_key='test:played')=interval '48 hours','report edits preserve window');
update private.mvp_rounds set closes_at=now()-interval '1 second' where match_key='test:played';
set local role anon;
select test.assert(jsonb_array_length(public.mvp_results())=2,'closed tied results published');
select test.assert((select bool_and((e->>'winner')::boolean) from jsonb_array_elements(public.mvp_results())e),'tie shares MVP');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select test.denied($q$select public.team_portal('vote','{"match_key":"test:played","candidate_id":"player-2"}')$q$);
reset role;
update public.published_reports set entries='[{"playerId":"player-1","goals":0,"assists":0,"yellow":0,"red":0}]' where match_key='test:played';
select test.assert((select count(*) from private.mvp_votes)=0,'removed attendees purge their votes and candidacy');
-- Revocation and inactive players lose access immediately.
update public.players set active=false where id='player-1';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select test.assert((public.team_portal()->>'pending')::boolean,'inactive players cannot enter');
reset role;
rollback;
