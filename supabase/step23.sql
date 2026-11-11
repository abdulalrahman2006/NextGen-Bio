-- Step 23: profile URLs use a username instead of the raw UUID (e.g. /u/abdulrahman instead of
-- /u/019f6032-...). Existing accounts get one generated from their name; new sign-ups get one
-- automatically too. People can change their own (own-profile update policy already allows it,
-- same as changing their name). Run this once, after step 22.

create or replace function public.slugify(txt text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Picks `base`, or base-2, base-3, ... until it finds one nobody else has (self_id excluded, so
-- re-running this for someone who already has a username doesn't change it needlessly).
create or replace function public.unique_username(base text, self_id uuid default null) returns text
language plpgsql as $$
declare
  root text := nullif(slugify(base), '');
  candidate text;
  n int := 0;
begin
  if root is null then root := 'student'; end if;
  loop
    candidate := case when n = 0 then root else root || '-' || n::text end;
    exit when not exists (select 1 from profiles where username = candidate and id is distinct from self_id);
    n := n + 1;
  end loop;
  return candidate;
end $$;

alter table public.profiles add column if not exists username text;

-- Backfill one row at a time (not a single bulk UPDATE) so each pick sees the ones before it and
-- nobody collides.
do $$
declare r record;
begin
  for r in select id, full_name from public.profiles where username is null order by created_at loop
    update public.profiles set username = unique_username(coalesce(r.full_name, 'student'), r.id) where id = r.id;
  end loop;
end $$;

alter table public.profiles alter column username set not null;
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles add constraint profiles_username_key unique (username);
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(username) between 2 and 30);

-- New sign-ups get a username right away too.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
begin
  insert into profiles (id, full_name, username) values (new.id, base, unique_username(base));
  return new;
end $$;

notify pgrst, 'reload schema';
