-- TEHNOCELL SPECIAL EVENT: VICE CITY
create table if not exists public.tc_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  constraint tc_events_valid_window check (ends_at > starts_at)
);
create table if not exists public.tc_avatar_frames (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  rarity text not null default 'limited',
  source_event_id uuid references public.tc_events(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.tc_event_progress (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.tc_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage smallint not null default 0 check (stage between 0 and 3),
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,user_id)
);
create table if not exists public.tc_user_frames (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  frame_id uuid not null references public.tc_avatar_frames(id) on delete restrict,
  source_event_id uuid references public.tc_events(id) on delete set null,
  acquired_at timestamptz not null default now(),
  unique(user_id,frame_id)
);
alter table public.profiles add column if not exists selected_avatar_frame_id uuid references public.tc_avatar_frames(id) on delete set null;
create index if not exists tc_event_progress_user_idx on public.tc_event_progress(user_id,event_id);
create index if not exists tc_user_frames_user_idx on public.tc_user_frames(user_id,acquired_at desc);
create index if not exists profiles_selected_avatar_frame_idx on public.profiles(selected_avatar_frame_id);
alter table public.tc_events enable row level security;
alter table public.tc_avatar_frames enable row level security;
alter table public.tc_event_progress enable row level security;
alter table public.tc_user_frames enable row level security;
drop policy if exists "Events are publicly readable" on public.tc_events;
create policy "Events are publicly readable" on public.tc_events for select to anon, authenticated using (status='active' and starts_at<=now());
drop policy if exists "Avatar frames are publicly readable" on public.tc_avatar_frames;
create policy "Avatar frames are publicly readable" on public.tc_avatar_frames for select to anon, authenticated using (true);
drop policy if exists "Users can read own event progress" on public.tc_event_progress;
create policy "Users can read own event progress" on public.tc_event_progress for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users can read own frame inventory" on public.tc_user_frames;
create policy "Users can read own frame inventory" on public.tc_user_frames for select to authenticated using ((select auth.uid())=user_id);
grant select on public.tc_events,public.tc_avatar_frames to anon,authenticated;
grant select on public.tc_event_progress,public.tc_user_frames to authenticated;
create or replace function public.tc_check_equipped_avatar_frame() returns trigger language plpgsql set search_path='' as $$
begin
 if new.selected_avatar_frame_id is not null and current_user not in ('service_role','postgres') and not exists (
  select 1 from public.tc_user_frames uf where uf.user_id=(select auth.uid()) and uf.frame_id=new.selected_avatar_frame_id
 ) then raise exception 'Эта рамка ещё не открыта для вашего аккаунта.'; end if;
 return new;
end; $$;
drop trigger if exists tc_profiles_frame_ownership on public.profiles;
create trigger tc_profiles_frame_ownership before insert or update of selected_avatar_frame_id on public.profiles for each row execute function public.tc_check_equipped_avatar_frame();
insert into public.tc_events(slug,title,starts_at,ends_at,status) values ('vice-city','VICE CITY',now(),now()+interval '14 days','active') on conflict(slug) do nothing;
insert into public.tc_avatar_frames(code,name,description,rarity,source_event_id)
select 'vice-city-limited','VICE CITY — LIMITED EDITION','Эксклюзивная рамка за прохождение специального расследования TEHNOCELL.','event-exclusive',e.id from public.tc_events e where e.slug='vice-city' on conflict(code) do nothing;
