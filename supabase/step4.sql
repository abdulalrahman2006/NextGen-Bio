-- Step 4: add the "idea" post type (ideas and experiments). Run once on an existing project.
alter table public.posts drop constraint if exists posts_post_type_check;
alter table public.posts add constraint posts_post_type_check
  check (post_type in ('article','idea','dataset','protocol','audio'));
