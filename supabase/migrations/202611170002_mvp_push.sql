begin;
create table private.mvp_push_rounds(
 match_key text primary key references private.mvp_rounds(match_key) on delete cascade,
 notified_at timestamptz not null default now()
);
create table private.mvp_push_outbox(
 id uuid primary key default gen_random_uuid(),
 match_key text not null references private.mvp_rounds(match_key) on delete cascade,
 subscription_id uuid not null references private.push_subscriptions(id) on delete cascade,
 title text not null,
 body text not null,
 attempts int not null default 0,
 available_at timestamptz not null default now(),
 lease_until timestamptz,
 finished boolean not null default false,
 unique(match_key,subscription_id)
);
alter table private.mvp_push_rounds enable row level security;
alter table private.mvp_push_outbox enable row level security;
revoke all on private.mvp_push_rounds,private.mvp_push_outbox from public,anon,authenticated;
create index mvp_push_pending on private.mvp_push_outbox(available_at) where not finished;

create function public.mvp_push_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; rec record; names text; win_count int; title text; body text; delivered int:=0;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Access denied';end if;
 if p_action='prepare' then
  for rec in select r.match_key from private.mvp_rounds r
   where r.closes_at<=now() and not exists(select 1 from private.mvp_push_rounds done where done.match_key=r.match_key)
   order by r.closes_at limit 50 for update of r skip locked
  loop
   -- Never announce an MVP if nobody voted.
   select string_agg(p.name, ' y ' order by p.number),count(*) into names,win_count
   from (
    select candidate_id,count(*) as votes from private.mvp_votes where match_key=rec.match_key group by candidate_id
   ) counts join public.players p on p.id=counts.candidate_id
   where counts.votes=(select max(v) from (select count(*) v from private.mvp_votes where match_key=rec.match_key group by candidate_id)x);
   insert into private.mvp_push_rounds(match_key) values(rec.match_key) on conflict do nothing;
   if win_count>0 then
    title:='LAST DANCE · ¡MVP decidido!';
    body:=case when win_count=1 then '¡' || names || ' es el MVP del partido! Consulta los resultados.'
      else '¡MVP compartido! ' || names || '. Consulta los resultados.' end;
    insert into private.mvp_push_outbox(match_key,subscription_id,title,body)
    select rec.match_key,s.id,title,body from private.push_subscriptions s
     join private.team_accounts a on a.user_id=s.user_id
     join public.players p on p.id=a.player_id and p.active
    on conflict do nothing;
    delivered:=delivered+1;
   end if;
  end loop;
  return jsonb_build_object('prepared',delivered);
 elsif p_action='claim' then
  with picked as (
   select o.id from private.mvp_push_outbox o
    join private.mvp_rounds r on r.match_key=o.match_key
    join private.push_subscriptions s on s.id=o.subscription_id
    join private.team_accounts a on a.user_id=s.user_id
    join public.players p on p.id=a.player_id and p.active
   where not o.finished and o.available_at<=now() and (o.lease_until is null or o.lease_until<now()) and o.attempts<5
    and r.closes_at<=now()
   order by o.available_at limit 50 for update of o skip locked
  ), claimed as (
   update private.mvp_push_outbox o set lease_until=now()+interval '2 minutes',attempts=o.attempts+1
   from picked where o.id=picked.id returning o.id,o.match_key,o.subscription_id,o.title,o.body
  )
  select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) into result from (
   select c.id,c.match_key,c.title,c.body,s.endpoint,s.p256dh,s.auth
   from claimed c join private.push_subscriptions s on s.id=c.subscription_id
  ) t;
  return result;
 elsif p_action='finish' then
  update private.mvp_push_outbox set
   finished=((p_payload->>'status')::int between 200 and 299)
     or ((p_payload->>'status')::int between 400 and 499 and (p_payload->>'status')::int not in (408,429)),
   lease_until=null,available_at=now()+interval '1 minute'*power(2,least(attempts,5))
  where id=(p_payload->>'id')::uuid;
  if (p_payload->>'status')::int in (404,410) then
   delete from private.push_subscriptions where id=(select subscription_id from private.mvp_push_outbox where id=(p_payload->>'id')::uuid);
  end if;
  return '{"ok":true}'::jsonb;
 else raise exception 'Invalid action';end if;
end$$;
revoke all on function public.mvp_push_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function public.mvp_push_dispatch(text,jsonb) to service_role;
commit;
