-- TEHNOCELL Moments: expiring stories and private media storage.
create table if not exists public.tc_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '' check (char_length(caption) <= 500),
  privacy text not null default 'everyone' check (privacy in ('everyone','friends')),
  music jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint tc_stories_media_owner_path check (media_path like user_id::text || '/%'),
  constraint tc_stories_expiry_window check (expires_at > created_at and expires_at <= created_at + interval '24 hours 5 minutes')
);
create index if not exists tc_stories_active_idx on public.tc_stories (expires_at desc, created_at desc);
create index if not exists tc_stories_user_active_idx on public.tc_stories (user_id, expires_at desc);
alter table public.tc_stories enable row level security;
drop policy if exists tc_stories_read_active on public.tc_stories;
create policy tc_stories_read_active on public.tc_stories for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    expires_at > now()
    and (
      privacy = 'everyone'
      or (
        privacy = 'friends'
        and exists (
          select 1 from public.tc_friend_requests f
          where f.status = 'accepted'
            and ((f.sender_id = user_id and f.receiver_id = (select auth.uid()))
              or (f.receiver_id = user_id and f.sender_id = (select auth.uid())))
        )
      )
    )
  )
);
drop policy if exists tc_stories_insert_own on public.tc_stories;
create policy tc_stories_insert_own on public.tc_stories for insert to authenticated
with check (
  user_id = (select auth.uid())
  and media_path like (select auth.uid())::text || '/%'
  and expires_at > now()
  and expires_at <= now() + interval '24 hours 5 minutes'
);
drop policy if exists tc_stories_delete_own on public.tc_stories;
create policy tc_stories_delete_own on public.tc_stories for delete to authenticated
using (user_id = (select auth.uid()));
grant select, insert, delete on public.tc_stories to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tc-stories','tc-stories',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists tc_stories_storage_upload_own on storage.objects;
create policy tc_stories_storage_upload_own on storage.objects for insert to authenticated
with check (bucket_id='tc-stories' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists tc_stories_storage_read_visible on storage.objects;
create policy tc_stories_storage_read_visible on storage.objects for select to authenticated
using (
 bucket_id='tc-stories'
 and exists (select 1 from public.tc_stories s where s.media_path=objects.name)
);
drop policy if exists tc_stories_storage_delete_own on storage.objects;
create policy tc_stories_storage_delete_own on storage.objects for delete to authenticated
using (bucket_id='tc-stories' and (storage.foldername(name))[1]=(select auth.uid())::text);
