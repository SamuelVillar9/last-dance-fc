begin;
create table private.user_activity (
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_seen_at timestamptz not null default now()
);
alter table private.user_activity enable row level security;
revoke all on private.user_activity from public,anon,authenticated;

-- The caller cannot supply an identity or a timestamp. Writes are rate limited
-- in PostgreSQL too, covering navigation, multiple tabs and concurrent devices.
create function private.record_activity() returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
 insert into private.user_activity(user_id,last_seen_at) values(uid,now())
 on conflict(user_id) do update set last_seen_at=excluded.last_seen_at
 where private.user_activity.last_seen_at <= now()-interval '5 minutes';
end; $$;
revoke all on function private.record_activity() from public,anon,authenticated;
grant execute on function private.record_activity() to authenticated;
create function public.record_activity() returns void
language sql security invoker set search_path='' as $$ select private.record_activity(); $$;
revoke all on function public.record_activity() from public,anon,authenticated;
grant execute on function public.record_activity() to authenticated;

-- Only the existing administrator allow-list can read Auth account details.
-- Include all accounts, even those that have no linked player or activity yet.
create function private.admin_user_activity() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.admins where user_id=auth.uid()) then
  raise exception 'Solo el administrador puede consultar la actividad' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',u.id,'email',u.email,'name',p.name,'number',p.number,'player_id',p.id,
  'is_admin',exists(select 1 from public.admins a where a.user_id=u.id),
  'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'last_seen_at',s.last_seen_at
 ) order by s.last_seen_at desc nulls last,u.created_at desc)
 from auth.users u left join private.team_accounts t on t.user_id=u.id
 left join public.players p on p.id=t.player_id
 left join private.user_activity s on s.user_id=u.id),'[]'::jsonb);
end; $$;
revoke all on function private.admin_user_activity() from public,anon,authenticated;
grant execute on function private.admin_user_activity() to authenticated;
create function public.admin_user_activity() returns jsonb
language sql stable security invoker set search_path='' as $$ select private.admin_user_activity(); $$;
revoke all on function public.admin_user_activity() from public,anon,authenticated;
grant execute on function public.admin_user_activity() to authenticated;
commit;
