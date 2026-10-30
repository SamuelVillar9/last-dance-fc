begin;
create table private.match_comments(
 id uuid primary key default gen_random_uuid(),
 match_key text not null references public.published_reports(match_key) on delete cascade,
 author_user_id uuid not null references auth.users(id) on delete cascade,
 author_player_id text not null references public.players(id),
 target_player_id text not null references public.players(id),
 body text not null check(char_length(body) between 1 and 280 and body=btrim(body,E' \t\r\n')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(match_key,author_user_id,target_player_id)
);
create index match_comments_match_page on private.match_comments(match_key,created_at desc,id desc);
create index match_comments_player_page on private.match_comments(target_player_id,created_at desc,id desc);
create index match_comments_author_player on private.match_comments(author_player_id);
create index match_comments_author_user on private.match_comments(author_user_id);
alter table private.match_comments enable row level security;
revoke all on private.match_comments from public,anon,authenticated;

-- These helpers deliberately live outside the exposed API schema, with fixed search paths.
create function private.commentable_match(p_match_key text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m
  where m->>'key'=p_match_key and m->>'status'='played'
  and (upper(btrim(m->>'home')) in ('LAST DANCE','LAST DANCE FC') or upper(btrim(m->>'away')) in ('LAST DANCE','LAST DANCE FC'))
 );
$$;
revoke all on function private.commentable_match(text) from public,anon,authenticated;

create function private.match_comments_page(p_match_key text,p_player_id text,p_target_id text,p_offset integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); pid text; admin boolean:=false; items jsonb; counts jsonb:='{}'; own jsonb; total integer; allowed boolean:=false;
begin
 if (p_match_key is null)=(p_player_id is null) or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'Consulta de comentarios no válida';end if;
 if p_match_key is null and p_target_id is not null then raise exception 'Filtro de jugador no válido';end if;
 if uid is not null then
  select a.player_id into pid from private.team_accounts a join public.players p on p.id=a.player_id where a.user_id=uid and p.active;
  select exists(select 1 from public.admins where user_id=uid) into admin;
 end if;
 if p_match_key is not null then
  allowed:=private.commentable_match(p_match_key) and exists(select 1 from public.published_reports where match_key=p_match_key);
  if allowed then
   select coalesce(jsonb_object_agg(target_player_id,n),'{}') into counts from (
    select c.target_player_id,count(*)::integer n from private.match_comments c
    join public.published_reports r on r.match_key=c.match_key
    where c.match_key=p_match_key and exists(select 1 from jsonb_array_elements(r.entries)e where e->>'playerId'=c.target_player_id)
    group by c.target_player_id
   ) totals;
  end if;
 end if;
 with visible as (
  select c.*,a.name author_name,a.number author_number,t.name target_name,t.number target_number
  from private.match_comments c join public.players a on a.id=c.author_player_id join public.players t on t.id=c.target_player_id
  join public.published_reports r on r.match_key=c.match_key
  where (p_match_key is null or c.match_key=p_match_key)
   and (p_player_id is null or c.target_player_id=p_player_id)
   and (p_target_id is null or c.target_player_id=p_target_id)
   and private.commentable_match(c.match_key)
   and exists(select 1 from jsonb_array_elements(r.entries)e where e->>'playerId'=c.target_player_id)
 ), page as (select * from visible order by created_at desc,id desc limit 10 offset p_offset)
 select (select count(*) from visible),coalesce((select jsonb_agg(jsonb_build_object(
  'id',id,'match_key',match_key,'author_player_id',author_player_id,'author_name',author_name,'author_number',author_number,
  'target_player_id',target_player_id,'target_name',target_name,'target_number',target_number,'body',body,
  'created_at',created_at,'updated_at',updated_at,'can_edit',coalesce(uid=author_user_id and pid is not null,false),
  'can_delete',coalesce(admin or (uid=author_user_id and pid is not null),false)
 ) order by created_at desc,id desc) from page),'[]') into total,items;
 if allowed and pid is not null and p_target_id is not null then
  select jsonb_build_object('id',id,'body',body) into own from private.match_comments
   where match_key=p_match_key and author_user_id=uid and target_player_id=p_target_id;
 end if;
 return jsonb_build_object('items',items,'has_more',p_offset+jsonb_array_length(items)<total,'counts',counts,'own_comment',own,
  'viewer',jsonb_build_object('player_id',pid,'admin',admin,'can_write',pid is not null and allowed));
end; $$;
revoke all on function private.match_comments_page(text,text,text,integer) from public,anon,authenticated;
grant execute on function private.match_comments_page(text,text,text,integer) to anon,authenticated;
create function public.match_comments_page(p_match_key text default null,p_player_id text default null,p_target_id text default null,p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$select private.match_comments_page(p_match_key,p_player_id,p_target_id,p_offset);$$;
revoke all on function public.match_comments_page(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.match_comments_page(text,text,text,integer) to anon,authenticated;

create function private.save_match_comment(p_match_key text,p_target_id text,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); pid text; entries jsonb; result uuid; message text:=btrim(coalesce(p_body,''),E' \t\r\n');
begin
 if uid is null then raise exception 'Inicia sesión para comentar';end if;
 select a.player_id into pid from private.team_accounts a join public.players p on p.id=a.player_id where a.user_id=uid and p.active;
 if pid is null then raise exception 'Tu cuenta debe estar vinculada a un jugador activo';end if;
 if char_length(message) not between 1 and 280 then raise exception 'Escribe entre 1 y 280 caracteres';end if;
 select r.entries into entries from public.published_reports r where r.match_key=p_match_key for share;
 if entries is null or not private.commentable_match(p_match_key) then raise exception 'Los comentarios se abren al finalizar el partido y publicar el acta';end if;
 if not exists(select 1 from jsonb_array_elements(entries)e where e->>'playerId'=p_target_id) then raise exception 'El jugador no figura en el acta';end if;
 insert into private.match_comments(match_key,author_user_id,author_player_id,target_player_id,body)
 values(p_match_key,uid,pid,p_target_id,message)
 on conflict(match_key,author_user_id,target_player_id) do update set body=excluded.body,updated_at=now()
 returning id into result;
 return result;
end; $$;
revoke all on function private.save_match_comment(text,text,text) from public,anon,authenticated;
grant execute on function private.save_match_comment(text,text,text) to authenticated;
create function public.save_match_comment(p_match_key text,p_target_id text,p_body text) returns uuid
language sql security invoker set search_path='' as $$select private.save_match_comment(p_match_key,p_target_id,p_body);$$;
revoke all on function public.save_match_comment(text,text,text) from public,anon,authenticated;
grant execute on function public.save_match_comment(text,text,text) to authenticated;

create function private.delete_match_comment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); active boolean; admin boolean;
begin
 if uid is null then raise exception 'Inicia sesión para borrar un comentario';end if;
 select exists(select 1 from public.admins where user_id=uid) into admin;
 select exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id where a.user_id=uid and p.active) into active;
 delete from private.match_comments where id=p_id and (admin or (active and author_user_id=uid));
 if not found then raise exception 'No puedes borrar este comentario o ya no existe';end if;
end; $$;
revoke all on function private.delete_match_comment(uuid) from public,anon,authenticated;
grant execute on function private.delete_match_comment(uuid) to authenticated;
create function public.delete_match_comment(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.delete_match_comment(p_id);$$;
revoke all on function public.delete_match_comment(uuid) from public,anon,authenticated;
grant execute on function public.delete_match_comment(uuid) to authenticated;
grant usage on schema private to anon,authenticated;
notify pgrst,'reload schema';
commit;
