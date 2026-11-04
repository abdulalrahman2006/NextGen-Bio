-- Step 8: comment replies, follow students, and new notification kinds. Run once, after step 7.

-- comment replies (a reply points at the comment it answers)
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;

-- notifications: allow "comment" and "follow" kinds (published / changes_requested are already allowed)
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('published','changes_requested','comment','follow'));

-- signed-in users may create comment/follow notifications (staff can already create any kind)
drop policy if exists "users create social notifications" on public.notifications;
create policy "users create social notifications" on public.notifications for insert
  to authenticated with check (kind in ('comment','follow'));

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
