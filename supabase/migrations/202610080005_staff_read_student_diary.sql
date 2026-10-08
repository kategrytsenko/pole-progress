-- Staff can read every student's diary in this studio.
-- One Supabase project is one studio, so is_staff() (admin or instructor)
-- is the studio boundary. There is no studio_id column.
--
-- Select only. A student still inserts, updates, and deletes only their own
-- attempts and media. Instructor comments stay on attempt_instructor_notes,
-- where staff can insert and update (202610080004).

create policy "attempts_select_staff"
on public.element_attempts
for select
to authenticated
using (public.is_staff());

create policy "media_select_staff"
on public.media
for select
to authenticated
using (public.is_staff());

-- Signed URLs for attempt photos and videos check storage.objects.
create policy "media_objects_select_staff"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and public.is_staff()
);
