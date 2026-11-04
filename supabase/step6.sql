-- Step 6: repair. Run this once, in the Supabase SQL Editor.
-- Step 5 first added a second link from posts to profiles (reviewed_by). That made every
-- "post together with its author" lookup ambiguous, so the Articles feed, reading page, search
-- and the Admin posts list came back empty. This removes the extra link.
-- Safe to run more than once, and safe even if step 5 was never run.
alter table public.posts drop constraint if exists posts_reviewed_by_fkey;
notify pgrst, 'reload schema';
