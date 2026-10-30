begin;
-- Identities and push endpoints stay outside the exposed schema.
create table private.comment_mentions(
 comment_id uuid not null references private.match_comments(id) on delete cascade,
 player_id text not null references public.players(id),label text not null,
 primary key(comment_id,player_id)
);
create table private.comment_mention_history(
 comment_id uuid not null references private.match_comments(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 primary key(comment_id,recipient_id)
);
create table private.comment_reactions(
 comment_id uuid not null references private.match_comments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 emoji text not null check(emoji in ('😂','🔥','👏','🤦')),
 primary key(comment_id,user_id)
);
create table private.rincon_notifications(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 comment_id uuid not null references private.match_comments(id) on delete cascade,
 created_at timestamptz not null default now(),read_at timestamptz,
 unique(user_id,comment_id)
);
create index rincon_notifications_user on private.rincon_notifications(user_id,created_at desc);
create table private.notification_settings(
 user_id uuid primary key references auth.users(id) on delete cascade,
 tutorial_dismissed boolean not null default false,mentions_push boolean not null default true
);
create table private.push_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(char_length(endpoint)<2048),p256dh text not null,auth text not null,
 created_at timestamptz not null default now(),last_test_at timestamptz
);
create index push_subscriptions_user on private.push_subscriptions(user_id);
create table private.push_outbox(
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references private.rincon_notifications(id) on delete cascade,
 subscription_id uuid not null references private.push_subscriptions(id) on delete cascade,
 attempts int not null default 0,available_at timestamptz not null default now(),lease_until timestamptz,
 finished boolean not null default false,unique(notification_id,subscription_id)
);
create index push_outbox_pending on private.push_outbox(available_at) where not finished;
do $$declare t text;begin foreach t in array array['comment_mentions','comment_mention_history','comment_reactions','rincon_notifications','notification_settings','push_subscriptions','push_outbox'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
end loop;end$$;

create function private.rincon_member() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id where a.user_id=auth.uid() and p.active);
$$;
revoke all on function private.rincon_member() from public,anon,authenticated;
create function private.comment_visible(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.match_comments c join public.published_reports r on r.match_key=c.match_key where c.id=cid and private.commentable_match(c.match_key) and exists(select 1 from jsonb_array_elements(r.entries)e where e->>'playerId'=c.target_player_id));
$$;
revoke all on function private.comment_visible(uuid) from public,anon,authenticated;

-- Preserve the existing pagination, filters and ownership rules.
alter function private.match_comments_page(text,text,text,integer) rename to match_comments_base;
create function private.match_comments_page(p_match_key text,p_player_id text,p_target_id text,p_offset integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;items jsonb;
begin
 page:=private.match_comments_base(p_match_key,p_player_id,p_target_id,p_offset);
 select coalesce(jsonb_agg(item || jsonb_build_object(
  'mentions',(select coalesce(jsonb_agg(jsonb_build_object('player_id',m.player_id,'label',m.label)),'[]') from private.comment_mentions m where m.comment_id=(item->>'id')::uuid),
  'reactions',(select coalesce(jsonb_agg(jsonb_build_object('emoji',r.emoji,'count',r.n,'mine',r.mine,'players',r.players)),'[]') from (
   select cr.emoji,count(*) n,bool_or(cr.user_id=auth.uid()) mine,jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'number',p.number) order by p.number) players
   from private.comment_reactions cr join private.team_accounts a on a.user_id=cr.user_id join public.players p on p.id=a.player_id and p.active
   where cr.comment_id=(item->>'id')::uuid group by cr.emoji
  )r)
 )),'[]') into items from jsonb_array_elements(page->'items')item;
 return page||jsonb_build_object('items',items,'can_react',private.rincon_member());
end;$$;
revoke all on function private.match_comments_page(text,text,text,integer) from public,anon,authenticated;
grant execute on function private.match_comments_page(text,text,text,integer) to anon,authenticated;

create function private.save_rincon_comment(p_match_key text,p_target_id text,p_body text,p_mentions jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid;mention jsonb;v_label text;recipient uuid;
begin
 if jsonb_typeof(p_mentions) is distinct from 'array' or jsonb_array_length(p_mentions)>30 then raise exception 'Menciones no válidas';end if;
 -- The existing saver checks active membership, final match and recipient in published acta.
 cid:=private.save_match_comment(p_match_key,p_target_id,p_body);
 for mention in select * from jsonb_array_elements(p_mentions) loop
  v_label:=mention->>'label';
  if v_label is null or v_label='' or position(v_label in p_body)=0 or not exists(
   select 1 from public.players p where p.id=mention->>'player_id' and
   (v_label='@'||p.name||'#'||p.number::text or exists(select 1 from private.comment_mentions old where old.comment_id=cid and old.player_id=p.id and old.label=v_label))
  ) then raise exception 'Selecciona una mención válida';end if;
 end loop;
 delete from private.comment_mentions where comment_id=cid;
 for mention in select * from jsonb_array_elements(p_mentions) loop
  insert into private.comment_mentions values(cid,mention->>'player_id',mention->>'label') on conflict do nothing;
  select a.user_id into recipient from private.team_accounts a join public.players p on p.id=a.player_id and p.active where a.player_id=mention->>'player_id';
  if recipient is not null and recipient<>auth.uid() then
   insert into private.comment_mention_history values(cid,recipient) on conflict do nothing;
   if found then
    insert into private.rincon_notifications(user_id,comment_id) values(recipient,cid);
   end if;
  end if;
 end loop;
 delete from private.rincon_notifications n where n.comment_id=cid and not exists(select 1 from private.comment_mentions m join private.team_accounts a on a.player_id=m.player_id where m.comment_id=cid and a.user_id=n.user_id);
 insert into private.push_outbox(notification_id,subscription_id)
 select n.id,s.id from private.rincon_notifications n join private.push_subscriptions s on s.user_id=n.user_id
 left join private.notification_settings prefs on prefs.user_id=n.user_id
 where n.comment_id=cid and n.read_at is null and coalesce(prefs.mentions_push,true)
 on conflict do nothing;
 return cid;
end;$$;
revoke all on function private.save_rincon_comment(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.save_rincon_comment(text,text,text,jsonb) to authenticated;
create function public.save_rincon_comment(p_match_key text,p_target_id text,p_body text,p_mentions jsonb default '[]') returns uuid language sql security invoker set search_path='' as $$select private.save_rincon_comment(p_match_key,p_target_id,p_body,p_mentions);$$;
revoke all on function public.save_rincon_comment(text,text,text,jsonb) from public,anon;
grant execute on function public.save_rincon_comment(text,text,text,jsonb) to authenticated;

create function private.react_rincon_comment(p_id uuid,p_emoji text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.rincon_member() then raise exception 'Necesitas una cuenta vinculada a un jugador activo';end if;
 if not private.comment_visible(p_id) then raise exception 'El comentario ya no está disponible';end if;
 if p_emoji is not null and p_emoji not in ('😂','🔥','👏','🤦') then raise exception 'Reacción no válida';end if;
 perform 1 from private.match_comments where id=p_id for update;
 if p_emoji is null then delete from private.comment_reactions where comment_id=p_id and user_id=auth.uid();
 else insert into private.comment_reactions values(p_id,auth.uid(),p_emoji) on conflict(comment_id,user_id) do update set emoji=excluded.emoji;end if;
end;$$;
revoke all on function private.react_rincon_comment(uuid,text) from public,anon,authenticated;
grant execute on function private.react_rincon_comment(uuid,text) to authenticated;
create function public.react_rincon_comment(p_id uuid,p_emoji text default null) returns void language sql security invoker set search_path='' as $$select private.react_rincon_comment(p_id,p_emoji);$$;
revoke all on function public.react_rincon_comment(uuid,text) from public,anon;
grant execute on function public.react_rincon_comment(uuid,text) to authenticated;

create function private.rincon_notices(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();ep text:=p_payload->>'endpoint';result jsonb;
begin
 if uid is null then raise exception 'Inicia sesión';end if;
 if not private.rincon_member() then raise exception 'Tu cuenta debe estar vinculada a un jugador activo';end if;
 if p_action='read' then update private.rincon_notifications set read_at=now() where user_id=uid and read_at is null and (p_payload->>'id' is null or id=(p_payload->>'id')::uuid);
 elsif p_action='settings' then
  insert into private.notification_settings(user_id,tutorial_dismissed,mentions_push) values(uid,coalesce((p_payload->>'tutorial_dismissed')::boolean,false),coalesce((p_payload->>'mentions_push')::boolean,true))
  on conflict(user_id) do update set tutorial_dismissed=coalesce((p_payload->>'tutorial_dismissed')::boolean,private.notification_settings.tutorial_dismissed),mentions_push=coalesce((p_payload->>'mentions_push')::boolean,private.notification_settings.mentions_push);
 elsif p_action='subscribe' then
  if ep is null or ep !~ '^https://([a-zA-Z0-9-]+\.)*(push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)/[^[:space:]]+$' and ep !~ '^https://fcm\.googleapis\.com/[^[:space:]]+$' then raise exception 'Dispositivo no válido';end if;
  if coalesce(p_payload->>'p256dh','') !~ '^[A-Za-z0-9_-]{87}=?$' or coalesce(p_payload->>'auth','') !~ '^[A-Za-z0-9_-]{22}==?$' and coalesce(p_payload->>'auth','') !~ '^[A-Za-z0-9_-]{22}$' then raise exception 'Claves no válidas';end if;
  if (select count(*) from private.push_subscriptions where user_id=uid)>=10 and not exists(select 1 from private.push_subscriptions where endpoint=ep and user_id=uid) then raise exception 'Desactiva otro dispositivo antes de añadir más';end if;
  insert into private.push_subscriptions(user_id,endpoint,p256dh,auth) values(uid,ep,p_payload->>'p256dh',p_payload->>'auth') on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth;
 elsif p_action='unsubscribe' then delete from private.push_subscriptions where user_id=uid and endpoint=ep;
 elsif p_action='test' then
  -- Endpoint is returned ONLY by the service-role RPC, never by this user RPC.
  update private.push_subscriptions set last_test_at=now() where user_id=uid and endpoint=ep and (last_test_at is null or last_test_at<now()-interval '30 seconds');
  if not found then raise exception 'Activa este dispositivo o espera 30 segundos entre pruebas';end if;
 elsif p_action<>'list' then raise exception 'Acción no válida';end if;
 select jsonb_build_object('items',coalesce((select jsonb_agg(n order by n.created_at desc) from (
  select n.id,n.created_at,n.read_at,c.match_key,c.id comment_id,c.target_player_id,p.name author_name
  from private.rincon_notifications n join private.match_comments c on c.id=n.comment_id join public.players p on p.id=c.author_player_id
  where n.user_id=uid and private.comment_visible(c.id) order by n.created_at desc limit 50
 )n),'[]'),'unread',(select count(*) from private.rincon_notifications n where n.user_id=uid and n.read_at is null and private.comment_visible(n.comment_id)),
 'tutorial_dismissed',coalesce((select tutorial_dismissed from private.notification_settings where user_id=uid),false),
 'mentions_push',coalesce((select mentions_push from private.notification_settings where user_id=uid),true),
 'device_active',exists(select 1 from private.push_subscriptions where user_id=uid and endpoint=ep)) into result;
 return result;
end;$$;
revoke all on function private.rincon_notices(text,jsonb) from public,anon,authenticated;
grant execute on function private.rincon_notices(text,jsonb) to authenticated;
create function public.rincon_notices(p_action text default 'list',p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.rincon_notices(p_action,p_payload);$$;
revoke all on function public.rincon_notices(text,jsonb) from public,anon;
grant execute on function public.rincon_notices(text,jsonb) to authenticated;

-- Server-only outbox leasing; SKIP LOCKED avoids concurrent dispatch duplicates.
create function private.rincon_dispatch(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_action='claim' then
  delete from private.push_outbox where notification_id in(select n.id from private.rincon_notifications n left join private.notification_settings s on s.user_id=n.user_id where n.read_at is not null or not coalesce(s.mentions_push,true) or not private.comment_visible(n.comment_id) or not exists(select 1 from private.team_accounts a join public.players p on p.id=a.player_id and p.active where a.user_id=n.user_id));
  with picked as (select id from private.push_outbox where not finished and attempts<5 and available_at<=now() and coalesce(lease_until,'-infinity')<now() order by available_at limit 30 for update skip locked), claimed as (
   update private.push_outbox o set attempts=attempts+1,lease_until=now()+interval '90 seconds' from picked where o.id=picked.id returning o.*
  ) select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'notification_id',n.id,'comment_id',c.id,'match_key',c.match_key,'target_id',c.target_player_id,'author_name',p.name,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth)),'[]') into result
  from claimed o join private.rincon_notifications n on n.id=o.notification_id join private.match_comments c on c.id=n.comment_id join public.players p on p.id=c.author_player_id join private.push_subscriptions s on s.id=o.subscription_id;
  return result;
 elsif p_action='finish' then
  if (p_payload->>'status')::int in (404,410) then delete from private.push_subscriptions where id=(select subscription_id from private.push_outbox where id=(p_payload->>'id')::uuid);
  else update private.push_outbox set finished=(p_payload->>'status')::int between 200 and 299 or ((p_payload->>'status')::int between 400 and 499 and (p_payload->>'status')::int not in (408,429)),lease_until=null,available_at=now()+interval '1 minute'*power(2,attempts) where id=(p_payload->>'id')::uuid;end if;
  return 'null';
 elsif p_action='test' then
  select jsonb_build_object('endpoint',endpoint,'p256dh',p256dh,'auth',auth) into result from private.push_subscriptions where user_id=(p_payload->>'user_id')::uuid and endpoint=p_payload->>'endpoint' and last_test_at>now()-interval '30 seconds';return result;
 end if;
 raise exception 'Acción no válida';
end;$$;
revoke all on function private.rincon_dispatch(text,jsonb) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.rincon_dispatch(text,jsonb) to service_role;
create function public.rincon_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.rincon_dispatch(p_action,p_payload);$$;
revoke all on function public.rincon_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function public.rincon_dispatch(text,jsonb) to service_role;
create function private.rincon_comments_page(p_match_key text,p_player_id text,p_target_id text,p_offset integer,p_focus_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page jsonb;offset_value integer:=p_offset;focus private.match_comments;own_mentions jsonb;
begin
 if p_focus_id is not null and p_offset=0 then
  select * into focus from private.match_comments where id=p_focus_id and private.comment_visible(id)
   and (p_match_key is null or match_key=p_match_key) and (p_player_id is null or target_player_id=p_player_id) and (p_target_id is null or target_player_id=p_target_id);
  if found then
   select (count(*)::int/10)*10 into offset_value from private.match_comments c where private.comment_visible(c.id)
    and (p_match_key is null or c.match_key=p_match_key) and (p_player_id is null or c.target_player_id=p_player_id) and (p_target_id is null or c.target_player_id=p_target_id)
    and (c.created_at,c.id)>(focus.created_at,focus.id);
  end if;
 end if;
 page:=private.match_comments_page(p_match_key,p_player_id,p_target_id,offset_value);
 if page->'own_comment' is not null and page->'own_comment'<>'null'::jsonb then
  select coalesce(jsonb_agg(jsonb_build_object('player_id',m.player_id,'label',m.label)),'[]') into own_mentions from private.comment_mentions m where m.comment_id=(page->'own_comment'->>'id')::uuid;
  page:=jsonb_set(page,'{own_comment,mentions}',own_mentions);
 end if;
 return page||jsonb_build_object('next_offset',offset_value+jsonb_array_length(page->'items'));
end;$$;
revoke all on function private.rincon_comments_page(text,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function private.rincon_comments_page(text,text,text,integer,uuid) to anon,authenticated;
create function public.rincon_comments_page(p_match_key text default null,p_player_id text default null,p_target_id text default null,p_offset integer default 0,p_focus_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$select private.rincon_comments_page(p_match_key,p_player_id,p_target_id,p_offset,p_focus_id);$$;
revoke all on function public.rincon_comments_page(text,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.rincon_comments_page(text,text,text,integer,uuid) to anon,authenticated;
-- Keep metadata consistent when an older client edits through the original saver.
create function private.rincon_comment_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from private.comment_mentions where comment_id=new.id and position(label in new.body)=0;
 delete from private.rincon_notifications n where n.comment_id=new.id and not exists(select 1 from private.comment_mentions m join private.team_accounts a on a.player_id=m.player_id where m.comment_id=new.id and a.user_id=n.user_id);
 return new;
end;$$;
revoke all on function private.rincon_comment_cleanup() from public,anon,authenticated;
create trigger rincon_comment_cleanup after update of body on private.match_comments for each row execute function private.rincon_comment_cleanup();
notify pgrst,'reload schema';
commit;
