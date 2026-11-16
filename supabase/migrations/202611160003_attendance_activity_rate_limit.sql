begin;
create or replace function private.attendance_enqueue(p_user uuid,p_match text,p_kind text,p_window text,p_title text,p_body text,p_due timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare nid uuid;begin
 if p_kind='activity' and exists(
  select 1 from private.attendance_notifications n
  where n.user_id=p_user and n.match_key=p_match and n.kind='activity'
   and n.created_at>now()-interval '24 hours'
 ) then return;end if;
 insert into private.attendance_notifications(user_id,match_key,kind,window_key,title,body,available_at)
 values(p_user,p_match,p_kind,p_window,p_title,p_body,private.attendance_local_time(p_due))
 on conflict(user_id,match_key,kind,window_key) do nothing returning id into nid;
 if nid is not null then
  insert into private.attendance_push_outbox(notification_id,subscription_id,available_at)
  select nid,s.id,private.attendance_local_time(p_due)
  from private.push_subscriptions s where s.user_id=p_user on conflict do nothing;
 end if;
end$$;
revoke all on function private.attendance_enqueue(uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;
commit;