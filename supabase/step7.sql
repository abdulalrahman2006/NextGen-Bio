-- Step 7: "trusted" students. A trusted student's posts publish immediately (no editor review).
-- Run this once in the Supabase SQL Editor, after step 6.
alter table public.profiles add column if not exists trusted boolean not null default false;

-- A student can update their own profile, but must not be able to change their role OR trusted flag.
drop policy if exists "own profile name update" on public.profiles;
create policy "own profile name update" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id
    and role = (select role from profiles where id = auth.uid())
    and trusted = (select trusted from profiles where id = auth.uid()));
