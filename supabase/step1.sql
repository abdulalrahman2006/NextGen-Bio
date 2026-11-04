-- Step 1: tags, author editing, profiles, image uploads, upload limits. Run once.

-- profiles: picture and details
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists website text;

-- posts: tags (the old category becomes the first tag)
alter table public.posts add column if not exists tags text[] not null default '{}';
update public.posts set tags = array[lower(category)] where tags = '{}';

-- authors can edit their own posts, but the result must go back to draft/pending for review
drop policy if exists "students edit own unpublished" on public.posts;
drop policy if exists "authors edit own posts" on public.posts;
create policy "authors edit own posts" on public.posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and status in ('draft','pending'));

-- images bucket (post images and profile pictures)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- upload limits per user
create or replace function public.upload_count(b text) returns int
language sql security definer set search_path = public, storage stable as $$
  select count(*)::int from storage.objects
  where bucket_id = b and (storage.foldername(name))[1] = auth.uid()::text;
$$;

drop policy if exists "users upload own audio" on storage.objects;
create policy "users upload own audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text and public.upload_count('audio') < 30);

drop policy if exists "users upload own images" on storage.objects;
create policy "users upload own images" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text and public.upload_count('images') < 60);

drop policy if exists "users delete own images" on storage.objects;
create policy "users delete own images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "staff delete images" on storage.objects;
create policy "staff delete images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.is_staff());
