-- Step 21: a private "save for later" list (Library). Unlike reposts, only the person who saved
-- a post can see that they saved it. Run this once, after step 20.

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);
alter table public.saves enable row level security;

drop policy if exists "own saves readable" on public.saves;
create policy "own saves readable" on public.saves for select using (user_id = auth.uid());
drop policy if exists "save as self" on public.saves;
create policy "save as self" on public.saves for insert with check (user_id = auth.uid());
drop policy if exists "unsave as self" on public.saves;
create policy "unsave as self" on public.saves for delete using (user_id = auth.uid());

create index if not exists saves_user_id_idx on public.saves(user_id);
create index if not exists saves_post_id_idx on public.saves(post_id);

notify pgrst, 'reload schema';
