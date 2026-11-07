-- Structural regression checks for the live-match module.
do $$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='live_events' and cmd='SELECT') then raise exception 'Live events require an explicit read policy';end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='live_events' and cmd in ('INSERT','UPDATE','DELETE')) then raise exception 'Client direct writes must be disabled';end if;
 if has_table_privilege('anon','public.live_permissions','SELECT') then raise exception 'Permissions must not be publicly readable';end if;
 if has_function_privilege('anon','public.live_set_permission(uuid,boolean,boolean)','EXECUTE') then raise exception 'Anonymous permission mutation';end if;
 if has_function_privilege('authenticated','public.live_dispatch(text,jsonb)','EXECUTE') then raise exception 'Dispatch must be service-only';end if;
 if not exists(select 1 from pg_trigger where tgname='live_queue_new_event' and not tgisinternal) then raise exception 'Push trigger missing';end if;
end $$;
