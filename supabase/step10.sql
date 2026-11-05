-- Step 10: re-asserts that admins can update any profile (role, trusted, etc).
-- Fixes "Only admins can change this" showing up even for a real admin.
-- Safe to run more than once, and safe even if the policy was already there.
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for update
  using (is_admin()) with check (is_admin());
notify pgrst, 'reload schema';
