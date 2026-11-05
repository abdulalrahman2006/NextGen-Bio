-- Step 14: podcast episodes (post_type = 'audio') are only meant to be postable by editors and
-- admins, but that was only enforced in the app, not the database. This adds the same rule to
-- the insert/submit and edit rules from step 12.
-- Run this once, after step 13.

drop policy if exists "insert own post" on public.posts;
create policy "insert own post" on public.posts for insert
  with check (
    author_id = auth.uid()
    and (post_type <> 'audio' or is_staff())
    and (
      status in ('draft','pending')
      or (status = 'published' and (is_staff() or exists (select 1 from profiles where id = auth.uid() and trusted)))
    )
  );

drop policy if exists "edit own unpublished post" on public.posts;
create policy "edit own unpublished post" on public.posts for update
  using (author_id = auth.uid() and status in ('draft','pending'))
  with check (
    author_id = auth.uid()
    and (post_type <> 'audio' or is_staff())
    and (
      status in ('draft','pending')
      or (status = 'published' and (is_staff() or exists (select 1 from profiles where id = auth.uid() and trusted)))
    )
  );

notify pgrst, 'reload schema';
