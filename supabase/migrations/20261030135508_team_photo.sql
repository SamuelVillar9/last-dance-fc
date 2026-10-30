begin;
create table public.team_photo(
 id boolean primary key default true check(id),
 image_path text check(image_path is null or image_path ~ '^official/[0-9a-f-]+\.webp$'),
 caption text not null default 'LAST DANCE FC · Temporada 2026/27' check(char_length(btrim(caption)) between 1 and 160),
 alt text not null default 'Composición de diez jugadores de LAST DANCE FC en dos filas sobre una pista de fútbol sala.' check(char_length(btrim(alt)) between 1 and 400),
 width integer not null default 1672 check(width between 800 and 8000),
 height integer not null default 941 check(height between 200 and 8000 and height<width),
 updated_at timestamptz not null default now()
);
insert into public.team_photo(id) values(true);
alter table public.team_photo enable row level security;
revoke all on public.team_photo from public,anon,authenticated;
grant select on public.team_photo to anon,authenticated;
grant update(image_path,caption,alt,width,height) on public.team_photo to authenticated;
create policy photo_public_read on public.team_photo for select to anon,authenticated using(true);
create policy photo_admin_update on public.team_photo for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create function private.team_photo_timestamp() returns trigger language plpgsql security invoker set search_path='' as $$begin new.updated_at:=clock_timestamp();return new;end$$;
revoke all on function private.team_photo_timestamp() from public,anon,authenticated;
create trigger team_photo_timestamp before update on public.team_photo for each row execute function private.team_photo_timestamp();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('team-photos','team-photos',true,5242880,array['image/webp']);
create policy team_photo_storage_read on storage.objects for select to anon,authenticated using(bucket_id='team-photos');
create policy team_photo_storage_insert on storage.objects for insert to authenticated with check(bucket_id='team-photos' and name ~ '^official/[0-9a-f-]+\.webp$' and (select public.is_admin()));
create policy team_photo_storage_delete on storage.objects for delete to authenticated using(bucket_id='team-photos' and (select public.is_admin()) and not exists(select 1 from public.team_photo p where p.image_path=name));
notify pgrst,'reload schema';
commit;
