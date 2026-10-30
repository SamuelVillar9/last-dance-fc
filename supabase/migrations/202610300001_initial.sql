begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
grant select on public.admins to authenticated;
create policy own_admin on public.admins for select to authenticated using (user_id=(select auth.uid()));
create function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$ select exists(select 1 from public.admins where user_id=(select auth.uid())); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
create table public.players(id text primary key default gen_random_uuid()::text,name text not null check(length(name) between 1 and 80),number integer not null check(number between 1 and 99),position text check(position in ('Portero','Cierre','Ala','Pívot') or position is null),photo_url text,active boolean not null default true);
create unique index unique_active_number on public.players(number) where active;
create table public.league_snapshots(id text primary key,data jsonb not null,updated_at timestamptz not null default now());
create table public.report_drafts(match_key text primary key,entries jsonb not null default '[]',note text not null default '' check(length(note)<=1000),updated_at timestamptz not null default now());
create table public.published_reports(like public.report_drafts including all);
create table private.sync_config(id boolean primary key default true check(id),secret_hash text not null,last_attempt timestamptz);
create table private.sync_log(id bigint generated always as identity primary key,created_at timestamptz not null default now(),success boolean not null);
create function public.validate_report() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.entries is null or jsonb_typeof(new.entries)<>'array' or jsonb_array_length(new.entries)>30 then raise exception 'Acta no válida'; end if;
 if exists(select 1 from jsonb_array_elements(new.entries) e where jsonb_typeof(e)<>'object' or not (e ?& array['playerId','goals','assists','yellow','red']) or jsonb_typeof(e->'playerId') is distinct from 'string' or jsonb_typeof(e->'goals') is distinct from 'number' or jsonb_typeof(e->'assists') is distinct from 'number' or jsonb_typeof(e->'yellow') is distinct from 'number' or jsonb_typeof(e->'red') is distinct from 'number' or not exists(select 1 from public.players p where p.id=e->>'playerId') or (e->>'goals') !~ '^\d+$' or (e->>'assists') !~ '^\d+$' or (e->>'yellow') !~ '^\d+$' or (e->>'red') !~ '^\d+$' or (e->>'goals')::int>100 or (e->>'assists')::int>100 or (e->>'yellow')::int>2 or (e->>'red')::int>1) then raise exception 'Participación no válida'; end if;
 if (select count(*) from jsonb_array_elements(new.entries))<>(select count(distinct e->>'playerId') from jsonb_array_elements(new.entries)e) then raise exception 'Jugador duplicado';end if;
 if not exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m where m->>'key'=new.match_key and m->>'status'='played' and (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE')) then raise exception 'El partido debe ser del LAST DANCE y tener resultado oficial';end if;
 new.updated_at=now();return new;
end; $$;
create trigger valid_draft before insert or update on public.report_drafts for each row execute function public.validate_report();
create trigger valid_published before insert or update on public.published_reports for each row execute function public.validate_report();
create function public.publish_report(p_match_key text,p_expected_at timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare draft public.report_drafts;
begin
 if not public.is_admin() then raise exception 'Acceso denegado';end if;
 select * into draft from public.report_drafts where match_key=p_match_key for update;
 if not found or draft.updated_at<>p_expected_at then raise exception 'El borrador ha cambiado; recarga antes de publicar';end if;
 insert into public.published_reports(match_key,entries,note) values(draft.match_key,draft.entries,draft.note) on conflict(match_key) do update set entries=excluded.entries,note=excluded.note;
end; $$;
revoke all on function public.publish_report(text,timestamptz) from public;
grant execute on function public.publish_report(text,timestamptz) to authenticated;
create function public.import_league(p_data jsonb,p_secret text default '') returns void language plpgsql security definer set search_path='' as $$
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
revoke all on function public.import_league(jsonb,text) from public;
grant execute on function public.import_league(jsonb,text) to anon,authenticated;
-- Public readers never see drafts or administrators. All mutations require the allow-listed identity.
do $$ declare t text;begin
 foreach t in array array['players','league_snapshots','report_drafts','published_reports'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))',t);
 end loop;
 foreach t in array array['players','league_snapshots','published_reports'] loop
 execute format('grant select on public.%I to anon',t);
 execute format('create policy public_read on public.%I for select to anon,authenticated using (true)',t);
 end loop;
 foreach t in array array['players','report_drafts','published_reports'] loop
 execute format('grant insert,update,delete on public.%I to authenticated',t);
 execute format('create policy admin_write on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',t);
 end loop;
end $$;
insert into public.players(id,number,name) values ('player-1',1,'Dani'),('player-2',2,'Álvaro'),('player-3',3,'Joaquín'),('player-4',4,'Miguel'),('player-6',6,'Fdez'),('player-7',7,'Samu'),('player-10',10,'Jony'),('player-11',11,'Kevin'),('player-14',14,'Dani'),('player-19',19,'Rafa Jarillo'),('player-20',20,'Rafa Rodríguez');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('players','players',true,524288,array['image/webp','image/jpeg','image/png']);
create policy photo_read on storage.objects for select to anon,authenticated using(bucket_id='players');
create policy photo_write on storage.objects for insert to authenticated with check(bucket_id='players' and (select public.is_admin()));
create policy photo_update on storage.objects for update to authenticated using(bucket_id='players' and (select public.is_admin())) with check(bucket_id='players' and (select public.is_admin()));
create policy photo_delete on storage.objects for delete to authenticated using(bucket_id='players' and (select public.is_admin()));
commit;
