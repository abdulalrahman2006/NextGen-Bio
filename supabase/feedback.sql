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
