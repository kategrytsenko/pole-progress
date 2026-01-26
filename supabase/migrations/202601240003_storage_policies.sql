-- Bucket must exist: 'media' (private)

-- Allow authenticated users to upload ONLY to:
-- user/{uid}/attempt/{attemptId}/...
drop policy if exists "media_objects_insert_own_path" on storage.objects;
create policy "media_objects_insert_own_path"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to read ONLY their own objects in that bucket/path
drop policy if exists "media_objects_select_own_path" on storage.objects;
create policy "media_objects_select_own_path"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to delete ONLY their own objects
drop policy if exists "media_objects_delete_own_path" on storage.objects;
create policy "media_objects_delete_own_path"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);
