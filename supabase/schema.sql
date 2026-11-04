-- NextGen Bio schema. Run in the Supabase SQL editor.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','editor','admin')),
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
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));
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
