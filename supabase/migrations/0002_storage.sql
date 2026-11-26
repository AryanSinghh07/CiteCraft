-- =====================================================================
-- CiteCraft v2 — file storage (Supabase Storage)
--   avatars   : public  — profile photos
--   documents : private — uploaded papers, only the owner can read them
-- Files are stored under "<user id>/..." and policies check that folder.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('documents', 'documents', false, 10485760, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- avatars ------------------------------------------------------------
drop policy if exists "Avatars: public read" on storage.objects;
create policy "Avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Avatars: owner insert" on storage.objects;
create policy "Avatars: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatars: owner update" on storage.objects;
create policy "Avatars: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatars: owner delete" on storage.objects;
create policy "Avatars: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- documents ----------------------------------------------------------
drop policy if exists "Documents: owner read" on storage.objects;
create policy "Documents: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Documents: owner insert" on storage.objects;
create policy "Documents: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Documents: owner delete" on storage.objects;
create policy "Documents: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
