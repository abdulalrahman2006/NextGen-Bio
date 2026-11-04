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
