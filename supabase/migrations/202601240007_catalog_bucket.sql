-- Public 'catalog' bucket for element/category imagery.
-- Read: world-readable (rendered on dashboard / element pages).
-- Write: admins only (public.is_admin() from 202601240002_rls.sql).

insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do nothing;

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
where id = 'catalog';

-- Public read (anon + authenticated). The bucket flag alone makes objects
-- accessible via public URL, but an explicit SELECT policy keeps the
-- storage.objects API consistent for clients listing files.
drop policy if exists "catalog_objects_select_public" on storage.objects;
create policy "catalog_objects_select_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'catalog');

-- Admin-only writes
drop policy if exists "catalog_objects_insert_admin" on storage.objects;
create policy "catalog_objects_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalog'
  and public.is_admin()
);

drop policy if exists "catalog_objects_update_admin" on storage.objects;
create policy "catalog_objects_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catalog'
  and public.is_admin()
)
with check (
  bucket_id = 'catalog'
  and public.is_admin()
);

drop policy if exists "catalog_objects_delete_admin" on storage.objects;
create policy "catalog_objects_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalog'
  and public.is_admin()
);
