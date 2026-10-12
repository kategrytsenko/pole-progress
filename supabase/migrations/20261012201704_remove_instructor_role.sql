-- Remove the instructor role. Admin keeps every check that used is_staff().
-- Existing instructor profiles become students. Instructor notes are deleted.
-- class_sessions.instructor_id stays: that column is the class teacher, not a role.

update public.profiles
set role = 'student'
where role::text = 'instructor';

create or replace function public.has_studio_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.client_passes cp
      where cp.user_id = auth.uid()
        and cp.status = 'active'
        and cp.valid_from <= now()
        and cp.valid_until >= now()
    );
$$;

drop policy if exists "profiles_select_staff_or_own" on public.profiles;
create policy "profiles_select_staff_or_own"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "attempts_select_staff" on public.element_attempts;
create policy "attempts_select_staff"
on public.element_attempts for select
to authenticated
using (public.is_admin());

drop policy if exists "media_select_staff" on public.media;
create policy "media_select_staff"
on public.media for select
to authenticated
using (public.is_admin());

drop policy if exists "media_objects_select_staff" on storage.objects;
create policy "media_objects_select_staff"
on storage.objects for select
to authenticated
using (
  bucket_id = 'media'
  and public.is_admin()
);

drop policy if exists "class_types_insert_staff" on public.class_types;
create policy "class_types_insert_staff"
on public.class_types for insert
to authenticated
with check (public.is_admin());

drop policy if exists "class_types_update_staff" on public.class_types;
create policy "class_types_update_staff"
on public.class_types for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "class_types_delete_staff" on public.class_types;
create policy "class_types_delete_staff"
on public.class_types for delete
to authenticated
using (public.is_admin());

drop policy if exists "class_sessions_insert_staff" on public.class_sessions;
create policy "class_sessions_insert_staff"
on public.class_sessions for insert
to authenticated
with check (public.is_admin());

drop policy if exists "class_sessions_update_staff" on public.class_sessions;
create policy "class_sessions_update_staff"
on public.class_sessions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "class_sessions_delete_staff" on public.class_sessions;
create policy "class_sessions_delete_staff"
on public.class_sessions for delete
to authenticated
using (public.is_admin());

drop policy if exists "pass_products_insert_staff" on public.pass_products;
create policy "pass_products_insert_staff"
on public.pass_products for insert
to authenticated
with check (public.is_admin());

drop policy if exists "pass_products_update_staff" on public.pass_products;
create policy "pass_products_update_staff"
on public.pass_products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pass_products_delete_staff" on public.pass_products;
create policy "pass_products_delete_staff"
on public.pass_products for delete
to authenticated
using (public.is_admin());

drop policy if exists "client_passes_select_staff_or_own" on public.client_passes;
create policy "client_passes_select_staff_or_own"
on public.client_passes for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "client_passes_delete_staff" on public.client_passes;
create policy "client_passes_delete_staff"
on public.client_passes for delete
to authenticated
using (public.is_admin());

drop policy if exists "bookings_select_staff_or_own" on public.bookings;
create policy "bookings_select_staff_or_own"
on public.bookings for select
to authenticated
using (
  public.has_studio_access()
  and (user_id = auth.uid() or public.is_admin())
);

drop policy if exists "bookings_insert_staff_or_own" on public.bookings;
create policy "bookings_insert_staff_or_own"
on public.bookings for insert
to authenticated
with check (
  public.has_studio_access()
  and (
    public.is_admin()
    or (
      user_id = auth.uid()
      and status = 'booked'
      and exists (
        select 1
        from public.class_sessions s
        where s.id = session_id
          and s.status = 'scheduled'
      )
      and exists (
        select 1
        from public.client_passes p
        where p.id = pass_id
          and p.user_id = auth.uid()
          and p.status = 'active'
          and p.remaining > 0
          and p.valid_until >= now()
      )
    )
  )
);

drop policy if exists "bookings_update_staff" on public.bookings;
create policy "bookings_update_staff"
on public.bookings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "bookings_delete_staff" on public.bookings;
create policy "bookings_delete_staff"
on public.bookings for delete
to authenticated
using (public.is_admin());

create or replace function private.viewer_can_read_attempt(attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.has_studio_access()
    and exists (
      select 1
      from public.element_attempts a
      where a.id = attempt
        and (
          a.user_id = auth.uid()
          or public.is_admin()
          or private.journal_is_public(a.user_id)
        )
    );
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_session public.class_sessions%rowtype;
  v_cutoff integer;
  v_restore boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not public.has_studio_access() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found or v_booking.status <> 'booked' then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if v_booking.user_id <> v_uid and not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_session
  from public.class_sessions
  where id = v_booking.session_id
  for update;

  if not found then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;

  select s.cancel_cutoff_hours into v_cutoff
  from public.app_settings s
  where s.id = 1;

  if v_cutoff is null then
    v_cutoff := 12;
  end if;

  v_restore := v_session.status = 'cancelled'
    or v_session.starts_at > (now() + make_interval(hours => v_cutoff));

  update public.bookings
  set status = 'cancelled'
  where id = v_booking.id
  returning * into v_booking;

  if v_restore then
    update public.client_passes
    set
      remaining = remaining + 1,
      status = case
        when status = 'exhausted' and valid_until >= now() then 'active'::public.client_pass_status
        else status
      end
    where id = v_booking.pass_id
      and status in ('active', 'exhausted');
  end if;

  return jsonb_build_object(
    'id', v_booking.id,
    'session_id', v_booking.session_id,
    'user_id', v_booking.user_id,
    'pass_id', v_booking.pass_id,
    'status', v_booking.status,
    'created_at', v_booking.created_at,
    'credit_restored', v_restore
  );
end;
$$;

drop policy if exists "profiles_select_instructor_note_author" on public.profiles;
drop table if exists public.attempt_instructor_notes;
drop function if exists public.stamp_attempt_instructor_note();

drop function if exists public.is_instructor();
drop function if exists public.is_staff();

-- Postgres cannot drop an enum label in place. Rebuild user_role without instructor.
-- The own-row update policy reads profiles.role, so it has to be dropped first.
drop policy if exists "profiles_update_admin_or_own" on public.profiles;

alter table public.profiles alter column role drop default;

alter type public.user_role rename to user_role_old;

create type public.user_role as enum ('admin', 'student');

alter table public.profiles
  alter column role type public.user_role
  using (role::text::public.user_role);

alter table public.profiles
  alter column role set default 'student'::public.user_role;

create policy "profiles_update_admin_or_own"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role::text is not distinct from public.profile_role_text(id)
  )
);

-- Rebind the signup insert to the new enum before the old type is dropped.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), 'student')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop type public.user_role_old;
