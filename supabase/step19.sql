-- Step 19: lets an admin suspend a student or editor for a set time (and lift it early).
-- Run this once, after step 18.

alter table public.profiles add column if not exists suspended_until timestamptz;

-- A student/editor must not be able to lift their own suspension by editing their own profile
-- directly (same reasoning as role/trusted in step 7).
drop policy if exists "own profile name update" on public.profiles;
create policy "own profile name update" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id
    and role = (select role from profiles where id = auth.uid())
    and trusted = (select trusted from profiles where id = auth.uid())
    and suspended_until is not distinct from (select suspended_until from profiles where id = auth.uid()));

notify pgrst, 'reload schema';
