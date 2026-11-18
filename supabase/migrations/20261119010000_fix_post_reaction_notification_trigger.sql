create or replace function public.tc_notify_post_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  target_user uuid;
  target_post uuid;
  actor_user uuid;
begin
  target_post := new.post_id;

  if tg_table_name = 'tc_comments' then
    actor_user := new.author_id;
  else
    actor_user := new.user_id;
  end if;

  select author_id
    into target_user
    from public.tc_posts
   where id = target_post;

  if target_user is not null and target_user <> actor_user then
    if tg_table_name = 'tc_comments' then
      insert into public.tc_notifications(user_id, actor_id, kind, post_id, comment_id)
      values (target_user, actor_user, 'comment', target_post, new.id);
    else
      insert into public.tc_notifications(user_id, actor_id, kind, post_id, comment_id)
      values (target_user, actor_user, 'like', target_post, null);
    end if;
  end if;

  return new;
end;
$function$;