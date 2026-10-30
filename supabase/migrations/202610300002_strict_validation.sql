begin;
create or replace function public.validate_report() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.entries is null or jsonb_typeof(new.entries)<>'array' or jsonb_array_length(new.entries)>30 then raise exception 'Acta no válida'; end if;
 if exists(select 1 from jsonb_array_elements(new.entries) e where jsonb_typeof(e)<>'object' or not (e ?& array['playerId','goals','assists','yellow','red']) or jsonb_typeof(e->'playerId') is distinct from 'string' or jsonb_typeof(e->'goals') is distinct from 'number' or jsonb_typeof(e->'assists') is distinct from 'number' or jsonb_typeof(e->'yellow') is distinct from 'number' or jsonb_typeof(e->'red') is distinct from 'number' or not exists(select 1 from public.players p where p.id=e->>'playerId') or (e->>'goals') !~ '^\d+$' or (e->>'assists') !~ '^\d+$' or (e->>'yellow') !~ '^\d+$' or (e->>'red') !~ '^\d+$' or (e->>'goals')::int>100 or (e->>'assists')::int>100 or (e->>'yellow')::int>2 or (e->>'red')::int>1) then raise exception 'Participación no válida'; end if;
 if (select count(*) from jsonb_array_elements(new.entries))<>(select count(distinct e->>'playerId') from jsonb_array_elements(new.entries)e) then raise exception 'Jugador duplicado';end if;
 if not exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m where m->>'key'=new.match_key and m->>'status'='played' and (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE')) then raise exception 'El partido debe ser del LAST DANCE y tener resultado oficial';end if;
 new.updated_at=now();return new;
end; $$;
create or replace function public.import_league(p_data jsonb,p_secret text default '') returns void language plpgsql security definer set search_path='' as $$
declare last_time timestamptz; expected text;
begin
 select secret_hash,last_attempt into expected,last_time from private.sync_config where id=true for update;
 if not coalesce(((auth.uid() is not null and exists(select 1 from public.admins where user_id=auth.uid())) or (length(p_secret)>=32 and expected=encode(extensions.digest(p_secret,'sha256'),'hex'))),false) then raise exception 'Acceso denegado';end if;
 if last_time is not null and last_time>now()-interval '60 seconds' then raise exception 'Espera un minuto entre actualizaciones';end if;
 if not pg_try_advisory_xact_lock(26270001) then raise exception 'Actualización en curso';end if;
 if p_data is null or p_data->>'phase' is distinct from 'Fase I' or p_data->>'group' is distinct from 'General' or jsonb_typeof(p_data->'matches')<>'array' or jsonb_array_length(p_data->'matches')<1 or jsonb_typeof(p_data->'standings')<>'array' or jsonb_array_length(p_data->'standings')<>15 or jsonb_typeof(p_data->'fairPlay')<>'array' or jsonb_array_length(p_data->'fairPlay')<>15 or length(p_data::text)>1000000 then raise exception 'Datos incompletos';end if;
 insert into public.league_snapshots(id,data) values('fase-i-general',jsonb_set(p_data,'{updatedAt}',to_jsonb(now()))) on conflict(id) do update set data=excluded.data,updated_at=now();
 update private.sync_config set last_attempt=now() where id=true;
 insert into private.sync_log(success) values(true);
 delete from private.sync_log where created_at<now()-interval '30 days';
end; $$;
commit;
