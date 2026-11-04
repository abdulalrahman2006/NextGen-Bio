-- Step 5: editor feedback to authors (change requests) and notifications. Run once on an existing project.
alter table public.posts
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid; -- deliberately not a foreign key: a second link to profiles would make author lookups ambiguous

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('published','changes_requested')),
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
create policy "delete own notifications" on public.notifications for delete using (user_id = auth.uid());
