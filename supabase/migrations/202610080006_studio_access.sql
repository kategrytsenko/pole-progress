-- Studio access: staff, or a client pass that is active right now.
-- The Angular guard uses the same rule (staff role, or has_studio_access()).
-- Security definer so the check does not depend on the caller's RLS.

create or replace function public.has_studio_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff()
    or exists (
      select 1
      from public.client_passes cp
      where cp.user_id = auth.uid()
        and cp.status = 'active'
        and cp.valid_from <= now()
        and cp.valid_until >= now()
    );
$$;

revoke all on function public.has_studio_access() from public, anon;
grant execute on function public.has_studio_access() to authenticated;

-- Diary and schedule reads/writes. Staff policies that already use is_staff()
-- stay as they are: is_staff() implies has_studio_access().

drop policy if exists "settings_select_auth" on public.app_settings;
create policy "settings_select_auth"
on public.app_settings for select
to authenticated
using (public.has_studio_access());

drop policy if exists "cats_select_auth" on public.element_categories;
create policy "cats_select_auth"
on public.element_categories for select
to authenticated
using (public.has_studio_access());

drop policy if exists "elements_select_auth" on public.elements;
create policy "elements_select_auth"
on public.elements for select
to authenticated
using (public.has_studio_access());

drop policy if exists "attempts_select_own" on public.element_attempts;
create policy "attempts_select_own"
on public.element_attempts for select
to authenticated
using (user_id = auth.uid() and public.has_studio_access());

drop policy if exists "attempts_insert_own" on public.element_attempts;
create policy "attempts_insert_own"
on public.element_attempts for insert
to authenticated
with check (user_id = auth.uid() and public.has_studio_access());

drop policy if exists "attempts_update_own" on public.element_attempts;
create policy "attempts_update_own"
on public.element_attempts for update
to authenticated
using (user_id = auth.uid() and public.has_studio_access())
with check (user_id = auth.uid() and public.has_studio_access());

drop policy if exists "attempts_delete_own" on public.element_attempts;
create policy "attempts_delete_own"
on public.element_attempts for delete
to authenticated
using (user_id = auth.uid() and public.has_studio_access());

drop policy if exists "media_select_own" on public.media;
create policy "media_select_own"
on public.media for select
to authenticated
using (
  public.has_studio_access()
  and exists (
    select 1
    from public.element_attempts a
    where a.id = media.attempt_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "media_insert_own" on public.media;
create policy "media_insert_own"
on public.media for insert
to authenticated
with check (
  public.has_studio_access()
  and exists (
    select 1
    from public.element_attempts a
    where a.id = media.attempt_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "media_delete_own" on public.media;
create policy "media_delete_own"
on public.media for delete
to authenticated
using (
  public.has_studio_access()
  and exists (
    select 1
    from public.element_attempts a
    where a.id = media.attempt_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "instructor_notes_select_staff_or_owner" on public.attempt_instructor_notes;
create policy "instructor_notes_select_staff_or_owner"
on public.attempt_instructor_notes for select
to authenticated
using (
  public.is_staff()
  or (
    public.has_studio_access()
    and exists (
      select 1
      from public.element_attempts a
      where a.id = attempt_id
        and a.user_id = auth.uid()
    )
  )
);

drop policy if exists "profiles_select_instructor_note_author" on public.profiles;
create policy "profiles_select_instructor_note_author"
on public.profiles for select
to authenticated
using (
  public.has_studio_access()
  and exists (
    select 1
    from public.attempt_instructor_notes n
    join public.element_attempts a on a.id = n.attempt_id
    where n.author_id = profiles.id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "class_types_select_auth" on public.class_types;
create policy "class_types_select_auth"
on public.class_types for select
to authenticated
using (public.has_studio_access());

drop policy if exists "class_sessions_select_auth" on public.class_sessions;
create policy "class_sessions_select_auth"
on public.class_sessions for select
to authenticated
using (public.has_studio_access());

drop policy if exists "pass_products_select_auth" on public.pass_products;
create policy "pass_products_select_auth"
on public.pass_products for select
to authenticated
using (public.has_studio_access());

drop policy if exists "bookings_select_staff_or_own" on public.bookings;
create policy "bookings_select_staff_or_own"
on public.bookings for select
to authenticated
using (
  public.has_studio_access()
  and (user_id = auth.uid() or public.is_staff())
);

drop policy if exists "bookings_insert_staff_or_own" on public.bookings;
create policy "bookings_insert_staff_or_own"
on public.bookings for insert
to authenticated
with check (
  public.has_studio_access()
  and (
    public.is_staff()
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

drop policy if exists "media_objects_insert_own_path" on storage.objects;
create policy "media_objects_insert_own_path"
on storage.objects for insert
to authenticated
with check (
  public.has_studio_access()
  and bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "media_objects_select_own_path" on storage.objects;
create policy "media_objects_select_own_path"
on storage.objects for select
to authenticated
using (
  public.has_studio_access()
  and bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "media_objects_delete_own_path" on storage.objects;
create policy "media_objects_delete_own_path"
on storage.objects for delete
to authenticated
using (
  public.has_studio_access()
  and bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Schedule RPCs are security definer and would otherwise skip the policies above.
create or replace function public.list_sessions_in_range(
  p_from timestamptz,
  p_to timestamptz,
  p_type_id uuid default null
)
returns table (
  id uuid,
  type_id uuid,
  type_name text,
  instructor_id uuid,
  instructor_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  booked_count integer,
  status public.class_session_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.type_id,
    ct.name,
    s.instructor_id,
    pr.name,
    s.starts_at,
    s.ends_at,
    s.capacity,
    (
      select count(*)::integer
      from public.bookings b
      where b.session_id = s.id
        and b.status = 'booked'
    ),
    s.status,
    s.created_at
  from public.class_sessions s
  join public.class_types ct on ct.id = s.type_id
  join public.profiles pr on pr.id = s.instructor_id
  where auth.uid() is not null
    and public.has_studio_access()
    and s.starts_at >= p_from
    and s.starts_at < p_to
    and (p_type_id is null or s.type_id = p_type_id)
  order by s.starts_at;
$$;

create or replace function public.get_session_card(p_id uuid)
returns table (
  id uuid,
  type_id uuid,
  type_name text,
  instructor_id uuid,
  instructor_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  booked_count integer,
  status public.class_session_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.type_id,
    ct.name,
    s.instructor_id,
    pr.name,
    s.starts_at,
    s.ends_at,
    s.capacity,
    (
      select count(*)::integer
      from public.bookings b
      where b.session_id = s.id
        and b.status = 'booked'
    ),
    s.status,
    s.created_at
  from public.class_sessions s
  join public.class_types ct on ct.id = s.type_id
  join public.profiles pr on pr.id = s.instructor_id
  where auth.uid() is not null
    and public.has_studio_access()
    and s.id = p_id;
$$;

create or replace function public.book_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.class_sessions%rowtype;
  v_pass public.client_passes%rowtype;
  v_booked integer;
  v_booking public.bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not public.has_studio_access() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_session
  from public.class_sessions
  where id = p_session_id
  for update;

  if not found
    or v_session.status <> 'scheduled'
    or v_session.starts_at <= now()
  then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bookings
    where session_id = p_session_id
      and user_id = v_uid
      and status = 'booked'
  ) then
    raise exception 'already_booked' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_booked
  from public.bookings
  where session_id = p_session_id
    and status = 'booked';

  if v_booked >= v_session.capacity then
    raise exception 'class_full' using errcode = 'P0001';
  end if;

  select * into v_pass
  from public.client_passes
  where user_id = v_uid
    and status = 'active'
    and remaining > 0
    and valid_from <= now()
    and valid_until >= now()
  order by valid_until asc, created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'no_pass' using errcode = 'P0001';
  end if;

  begin
    insert into public.bookings (session_id, user_id, pass_id, status)
    values (p_session_id, v_uid, v_pass.id, 'booked')
    returning * into v_booking;
  exception
    when unique_violation then
      raise exception 'already_booked' using errcode = 'P0001';
  end;

  update public.client_passes
  set
    remaining = remaining - 1,
    status = case
      when remaining - 1 = 0 then 'exhausted'::public.client_pass_status
      else status
    end
  where id = v_pass.id;

  return jsonb_build_object(
    'id', v_booking.id,
    'session_id', v_booking.session_id,
    'user_id', v_booking.user_id,
    'pass_id', v_booking.pass_id,
    'status', v_booking.status,
    'created_at', v_booking.created_at
  );
end;
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

  if v_booking.user_id <> v_uid and not public.is_staff() then
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
