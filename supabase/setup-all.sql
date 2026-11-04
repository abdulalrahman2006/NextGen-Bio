-- NextGen Bio: complete database setup for a NEW, empty Supabase project.
-- Paste this whole file into Supabase > SQL Editor and click Run, once.

-- ======== schema.sql ========
-- NextGen Bio schema. Run in the Supabase SQL editor.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','editor','admin')),
  trusted boolean not null default false,
  created_at timestamptz default now()
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  post_type text not null check (post_type in ('article','dataset','protocol','audio')),
  category text not null,
  content text not null default '',
  metadata jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','pending','published')),
  created_at timestamptz default now()
);
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (post_id, user_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  section_name text unique not null,
  content_json jsonb not null default '{}'
);

-- helper: staff check (security definer avoids recursive RLS on profiles)
create or replace function public.is_staff() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','editor'));
$$;
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table profiles enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table site_settings enable row level security;

-- profiles
create policy "profiles readable" on profiles for select using (true);
create policy "own profile name update" on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id
    and role = (select role from profiles where id = auth.uid())
    and trusted = (select trusted from profiles where id = auth.uid()));
create policy "admins manage profiles" on profiles for update using (is_admin()) with check (is_admin());

-- posts
create policy "published readable" on posts for select using (status = 'published' or author_id = auth.uid() or is_staff());
create policy "students insert draft or pending" on posts for insert
  with check (author_id = auth.uid() and status in ('draft','pending'));
create policy "students edit own unpublished" on posts for update
  using (author_id = auth.uid() and status in ('draft','pending'))
  with check (author_id = auth.uid() and status in ('draft','pending'));
create policy "staff update all posts" on posts for update using (is_staff()) with check (is_staff());
create policy "staff delete posts" on posts for delete using (is_staff());
create policy "students delete own drafts" on posts for delete using (author_id = auth.uid() and status = 'draft');

-- likes & comments
create policy "likes readable" on likes for select using (true);
create policy "like as self" on likes for insert with check (auth.uid() = user_id);
create policy "unlike as self" on likes for delete using (auth.uid() = user_id);
create policy "comments readable" on comments for select using (true);
create policy "comment as self" on comments for insert with check (auth.uid() = user_id);
create policy "delete own or staff comment" on comments for delete using (auth.uid() = user_id or is_staff());

-- site settings
create policy "settings readable" on site_settings for select using (true);
create policy "staff write settings" on site_settings for insert with check (is_staff());
create policy "staff update settings" on site_settings for update using (is_staff()) with check (is_staff());

-- seed
insert into site_settings (section_name, content_json) values
 ('hero', '{"line1":"BIOTECH RESEARCH.","line2":"DECODED."}'),
 ('intro', '{"text":"Student-written research, ideas, experiments and podcasts from the biotechnology community."}');

-- like counts view
create or replace view public.post_stats as
select p.id as post_id,
  (select count(*) from likes l where l.post_id = p.id) as like_count,
  (select count(*) from comments c where c.post_id = p.id) as comment_count
from posts p;

-- ======== storage-audio.sql ========
-- Storage bucket for podcast audio, video and cover images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 52428800,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/aac','video/mp4','video/webm','video/quicktime','video/ogg','image/jpeg','image/png','image/webp'])
on conflict (id) do update set allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own audio" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "staff delete audio" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and public.is_staff());

-- ======== feedback.sql ========
-- Feedback box: students send, only admins read. Run once in the Supabase SQL editor.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('suggestion','complaint','problem')),
  message text not null check (char_length(message) between 5 and 2000),
  status text not null default 'new' check (status in ('new','reviewed','resolved')),
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;
create policy "signed-in users send feedback" on public.feedback for insert to authenticated
  with check (user_id is null or user_id = auth.uid());
create policy "admins read feedback" on public.feedback for select using (public.is_admin());
create policy "admins update feedback" on public.feedback for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete feedback" on public.feedback for delete using (public.is_admin());

-- ======== step1.sql ========
-- Step 1: tags, author editing, profiles, image uploads, upload limits. Run once.

-- profiles: picture and details
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists website text;

-- posts: tags (the old category becomes the first tag)
alter table public.posts add column if not exists tags text[] not null default '{}';
update public.posts set tags = array[lower(category)] where tags = '{}';

-- authors can edit their own posts, but the result must go back to draft/pending for review
drop policy if exists "students edit own unpublished" on public.posts;
drop policy if exists "authors edit own posts" on public.posts;
create policy "authors edit own posts" on public.posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and status in ('draft','pending'));

-- images bucket (post images and profile pictures)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- upload limits per user
create or replace function public.upload_count(b text) returns int
language sql security definer set search_path = public, storage stable as $$
  select count(*)::int from storage.objects
  where bucket_id = b and (storage.foldername(name))[1] = auth.uid()::text;
$$;

drop policy if exists "users upload own audio" on storage.objects;
create policy "users upload own audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text and public.upload_count('audio') < 30);

drop policy if exists "users upload own images" on storage.objects;
create policy "users upload own images" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text and public.upload_count('images') < 60);

drop policy if exists "users delete own images" on storage.objects;
create policy "users delete own images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "staff delete images" on storage.objects;
create policy "staff delete images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.is_staff());

-- ======== step3.sql ========
-- Step 3: reports and moderation. Run once in the Supabase SQL editor.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('post','comment','profile')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','offensive','misinformation','copyright','other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz default now()
);
alter table public.reports enable row level security;

-- one open report per person per item (stops repeat reports)
create unique index reports_one_open_per_user on public.reports (reporter_id, target_type, target_id) where status = 'open';

create policy "signed-in users report" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "staff read reports" on public.reports for select using (public.is_staff());
create policy "staff update reports" on public.reports for update using (public.is_staff()) with check (public.is_staff());
create policy "staff delete reports" on public.reports for delete using (public.is_staff());

-- ======== step4.sql ========
-- Step 4: add the "idea" post type (ideas and experiments). Run once on an existing project.
alter table public.posts drop constraint if exists posts_post_type_check;
alter table public.posts add constraint posts_post_type_check
  check (post_type in ('article','idea','dataset','protocol','audio'));

-- ======== step5.sql ========
-- Step 5: editor feedback to authors (change requests) and notifications. Run once on an existing project.
alter table public.posts
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid; -- deliberately not a foreign key: a second link to profiles would make author lookups ambiguous

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('published','changes_requested','comment','follow')),
  post_id uuid references public.posts(id) on delete cascade,
  message text not null check (char_length(message) <= 300),
  read_at timestamptz,
  created_at timestamptz default now()
);
create index notifications_user_unread on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;

create policy "read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "mark own notifications read" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff create notifications" on public.notifications for insert with check (public.is_staff());
create policy "users create social notifications" on public.notifications for insert
  to authenticated with check (kind in ('comment','follow'));
create policy "delete own notifications" on public.notifications for delete using (user_id = auth.uid());

-- ======== step6.sql ========
-- Step 6: repair. Run this once, in the Supabase SQL Editor.
-- Step 5 first added a second link from posts to profiles (reviewed_by). That made every
-- "post together with its author" lookup ambiguous, so the Articles feed, reading page, search
-- and the Admin posts list came back empty. This removes the extra link.
-- Safe to run more than once, and safe even if step 5 was never run.
alter table public.posts drop constraint if exists posts_reviewed_by_fkey;
notify pgrst, 'reload schema';

-- ======== step8.sql ========
-- follow students
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table public.follows enable row level security;
create policy "follows readable" on public.follows for select using (true);
create policy "follow as self" on public.follows for insert with check (follower_id = auth.uid());
create policy "unfollow as self" on public.follows for delete using (follower_id = auth.uid());

