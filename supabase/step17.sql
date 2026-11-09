-- Step 17: cleans up already-published posts that got the stray backslash from the
-- escaped-space bug fixed in the app (see RichEditor.tsx). Safe to run more than once.
-- Run this once, after step 16.
update public.posts set content = replace(content, '\ ', ' ') where content like '%\ %';
