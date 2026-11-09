-- Step 20: lets an admin record why an account was suspended.
-- Run this once, after step 19.
alter table public.profiles add column if not exists suspension_reason text;
notify pgrst, 'reload schema';
