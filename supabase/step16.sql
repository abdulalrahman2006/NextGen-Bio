-- Step 16: authors can now delete their own post regardless of status, including published ones
-- (deleting is separate from editing -- published posts still can't be edited by their author,
-- only deleted entirely).
-- Run this once, after step 15.
drop policy if exists "authors delete own unpublished" on public.posts;
create policy "authors delete own posts" on public.posts for delete
  using (author_id = auth.uid());
notify pgrst, 'reload schema';
