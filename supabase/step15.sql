-- Step 15: authors can now edit their own pending (submitted, awaiting review) post, not just
-- drafts -- so they should be able to delete it too, in case they change their mind. This
-- widens the existing "students delete own drafts" rule to also cover pending.
-- Run this once, after step 14.
drop policy if exists "students delete own drafts" on public.posts;
create policy "authors delete own unpublished" on public.posts for delete
  using (author_id = auth.uid() and status in ('draft', 'pending'));
notify pgrst, 'reload schema';
