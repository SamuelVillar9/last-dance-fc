begin;
create function public.live_my_permissions() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('can_record',public.is_admin() or coalesce((select p.can_record from public.live_permissions p where p.user_id=auth.uid()),false),'can_control',public.is_admin() or coalesce((select p.can_control from public.live_permissions p where p.user_id=auth.uid()),false));
$$;
revoke all on function public.live_my_permissions() from public,anon;
grant execute on function public.live_my_permissions() to authenticated;
create function public.live_admin_permissions() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Acceso denegado';end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',a.user_id,'player_id',p.id,'name',p.name,'number',p.number,'can_record',coalesce(lp.can_record,false),'can_control',coalesce(lp.can_control,false)) order by p.number),'[]'::jsonb) into result
 from private.team_accounts a join public.players p on p.id=a.player_id and p.active left join public.live_permissions lp on lp.user_id=a.user_id;
 return result;
end;$$;
revoke all on function public.live_admin_permissions() from public,anon;
grant execute on function public.live_admin_permissions() to authenticated;
-- Only active team members receive match push. Opt-out applies independently of mentions.
alter table private.notification_settings add column if not exists live_push boolean not null default true;
create function public.live_push_preference(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id and p.active where a.user_id=auth.uid()) then raise exception 'No eres integrante activo';end if;
 insert into private.notification_settings(user_id,live_push) values(auth.uid(),p_enabled)
 on conflict(user_id) do update set live_push=excluded.live_push;
end;$$;
revoke all on function public.live_push_preference(boolean) from public,anon;
grant execute on function public.live_push_preference(boolean) to authenticated;
-- Existing subscribers who opted out are excluded before queuing a new event.
create or replace function private.live_queue_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.live_push_outbox(event_id,subscription_id)
 select new.id,s.id from private.push_subscriptions s
 join private.team_accounts a on a.user_id=s.user_id
 join public.players p on p.id=a.player_id and p.active
 left join private.notification_settings n on n.user_id=s.user_id
 where coalesce(n.live_push,true)
 on conflict do nothing;
 return new;
end;$$;
revoke all on function private.live_queue_event() from public,anon,authenticated;
create trigger live_queue_new_event after insert on public.live_events for each row execute function private.live_queue_event();
-- Ensure a worker can claim jobs atomically and only via service_role.
create function public.live_dispatch(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.role()<>'service_role' then raise exception 'Acceso denegado';end if;
 if p_action='claim' then
 with claimed as (
 select o.id from private.live_push_outbox o where not o.finished and o.available_at<=now() and o.attempts<5 order by o.available_at for update skip locked limit 50
 ), updated as (
 update private.live_push_outbox o set attempts=o.attempts+1,available_at=now()+interval '2 minutes'
 from claimed c where o.id=c.id returning o.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,'event_id',e.id,'match_key',e.match_key,'kind',e.kind,'side',e.side,'minute',e.minute,'player_name',p.name,'assist_name',ap.name,'home_goals',m.home_goals,'away_goals',m.away_goals)),'[]'::jsonb) into result
 from updated u join public.live_events e on e.id=u.event_id
 join private.push_subscriptions s on s.id=u.subscription_id
 join public.live_matches m on m.match_key=e.match_key
 left join public.players p on p.id=e.player_id left join public.players ap on ap.id=e.assist_player_id
 where e.voided_at is null;
 return result;
 elsif p_action='finish' then
 update private.live_push_outbox set finished=(p_payload->>'status')::integer between 200 and 299 or (p_payload->>'status')::integer in (404,410),
 available_at=now()+interval '5 minutes'
 where id=(p_payload->>'id')::uuid;
 return '{}'::jsonb;
 end if;
 raise exception 'Acción desconocida';
end;$$;
revoke all on function public.live_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function public.live_dispatch(text,jsonb) to service_role;
commit;
