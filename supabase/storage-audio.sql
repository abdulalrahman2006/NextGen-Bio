-- Storage bucket for podcast audio, video and cover images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 52428800,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/aac','video/mp4','video/webm','video/quicktime','video/ogg','image/jpeg','image/png','image/webp'])
on conflict (id) do update set allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own audio" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "staff delete audio" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and public.is_staff());
