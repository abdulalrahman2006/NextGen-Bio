-- Step 18: reposts. Anyone can repost a published post, with an optional short note, and it
-- shows up on their own profile. One repost per person per post (reposting again with a new
-- note just updates it). Run this once, after step 17.

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);
alter table public.reposts enable row level security;

drop policy if exists "reposts readable" on public.reposts;
create policy "reposts readable" on public.reposts for select using (true);
drop policy if exists "repost as self" on public.reposts;
create policy "repost as self" on public.reposts for insert with check (user_id = auth.uid());
drop policy if exists "update own repost" on public.reposts;
create policy "update own repost" on public.reposts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "undo own repost" on public.reposts;
create policy "undo own repost" on public.reposts for delete using (user_id = auth.uid());

create index if not exists reposts_post_id_idx on public.reposts(post_id);
create index if not exists reposts_user_id_idx on public.reposts(user_id);

create or replace view public.post_stats as
select p.id as post_id,
  (select count(*) from likes l where l.post_id = p.id) as like_count,
  (select count(*) from comments c where c.post_id = p.id) as comment_count,
  (select count(*) from reposts r where r.post_id = p.id) as repost_count
from posts p;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('published','changes_requested','comment','follow','flagged','repost'));

notify pgrst, 'reload schema';
