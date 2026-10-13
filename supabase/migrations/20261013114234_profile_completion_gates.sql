-- Signed-in reads of the schedule and of public journals no longer require a pass.
-- Booking, diary writes, media writes, likes, and comments also require a
-- completed profile. has_studio_access() is unchanged: admin, or an active
-- pass. A completed profile is not a pass. Private journals stay with the
-- owner (who still needs studio access) and with admins.
-- Phone stays off the peer-visible profile columns.

comment on column public.profiles.journal_public is
  'When true, any signed-in user can read this diary, its media, likes, and comments. Writes still need a completed profile and studio access.';

-- Schedule filter and the cutoff shown on the schedule. Session rows themselves
-- stay behind the security-definer RPCs below, not a wider table select.
drop policy if exists "class_types_select_auth" on public.class_types;
create policy "class_types_select_auth"
on public.class_types for select
to authenticated
using (true);

drop policy if exists "settings_select_auth" on public.app_settings;
create policy "settings_select_auth"
on public.app_settings for select
to authenticated
using (true);

-- A public journal page lists the shared catalog. These rows are not diary
-- content. Admin write policies are unchanged, and private attempts are not
-- opened by this select.
drop policy if exists "cats_select_auth" on public.element_categories;
create policy "cats_select_auth"
on public.element_categories for select
to authenticated
using (true);

drop policy if exists "elements_select_auth" on public.elements;
create policy "elements_select_auth"
on public.elements for select
to authenticated
using (true);

drop policy if exists "profiles_select_public_journal" on public.profiles;
create policy "profiles_select_public_journal"
on public.profiles for select
to authenticated
using (journal_public = true);

drop policy if exists "attempts_select_public_journal" on public.element_attempts;
create policy "attempts_select_public_journal"
on public.element_attempts for select
to authenticated
using (private.journal_is_public(user_id));

drop policy if exists "media_select_public_journal" on public.media;
create policy "media_select_public_journal"
on public.media for select
to authenticated
using (private.journal_is_public(private.attempt_owner(attempt_id)));

drop policy if exists "media_objects_select_public_journal" on storage.objects;
create policy "media_objects_select_public_journal"
on storage.objects for select
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and private.journal_is_public_folder((storage.foldername(name))[2])
);

-- Owner read of a private diary still needs studio access. A public journal
-- does not. Admin read does not depend on a pass or on profile completion.
create or replace function private.viewer_can_read_attempt(attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.element_attempts a
      where a.id = attempt
        and (
          public.is_admin()
          or (a.user_id = auth.uid() and public.has_studio_access())
          or private.journal_is_public(a.user_id)
        )
    );
$$;

drop policy if exists "profiles_select_attempt_comment_author" on public.profiles;
create policy "profiles_select_attempt_comment_author"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.attempt_comments c
    where c.author_id = profiles.id
      and private.viewer_can_read_attempt(c.attempt_id)
  )
);

-- Diary writes. Ownership and studio access stay. Profile completion is added.
-- Admin select policies are not write policies and are left as they are.

drop policy if exists "attempts_insert_own" on public.element_attempts;
create policy "attempts_insert_own"
on public.element_attempts for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
);

drop policy if exists "attempts_update_own" on public.element_attempts;
create policy "attempts_update_own"
on public.element_attempts for update
to authenticated
using (
  user_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
)
with check (
  user_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
);

drop policy if exists "attempts_delete_own" on public.element_attempts;
create policy "attempts_delete_own"
on public.element_attempts for delete
to authenticated
using (
  user_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
);

drop policy if exists "media_insert_own" on public.media;
create policy "media_insert_own"
on public.media for insert
to authenticated
with check (
  public.has_studio_access()
  and public.profile_is_complete()
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
  and public.profile_is_complete()
  and exists (
    select 1
    from public.element_attempts a
    where a.id = media.attempt_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "media_objects_insert_own_path" on storage.objects;
create policy "media_objects_insert_own_path"
on storage.objects for insert
to authenticated
with check (
  public.has_studio_access()
  and public.profile_is_complete()
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
  and public.profile_is_complete()
  and bucket_id = 'media'
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "likes_insert_public_journal" on public.attempt_likes;
create policy "likes_insert_public_journal"
on public.attempt_likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
  and private.attempt_owner(attempt_id) is not null
  and private.attempt_owner(attempt_id) is distinct from auth.uid()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

drop policy if exists "likes_delete_own_public_journal" on public.attempt_likes;
create policy "likes_delete_own_public_journal"
on public.attempt_likes for delete
to authenticated
using (
  user_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

drop policy if exists "comments_insert_public_journal" on public.attempt_comments;
create policy "comments_insert_public_journal"
on public.attempt_comments for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
  and private.attempt_owner(attempt_id) is not null
  and private.attempt_owner(attempt_id) is distinct from auth.uid()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

drop policy if exists "comments_update_author" on public.attempt_comments;
create policy "comments_update_author"
on public.attempt_comments for update
to authenticated
using (
  author_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
  and private.journal_is_public(private.attempt_owner(attempt_id))
)
with check (
  author_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

drop policy if exists "comments_delete_author" on public.attempt_comments;
create policy "comments_delete_author"
on public.attempt_comments for delete
to authenticated
using (
  author_id = auth.uid()
  and public.has_studio_access()
  and public.profile_is_complete()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

drop policy if exists "comments_delete_attempt_owner" on public.attempt_comments;
create policy "comments_delete_attempt_owner"
on public.attempt_comments for delete
to authenticated
using (
  private.attempt_owner(attempt_id) = auth.uid()
  and public.profile_is_complete()
);

-- Direct client insert remains until the booking-integrity milestone. It cannot
-- skip profile completion. Admin insert is unchanged.
drop policy if exists "bookings_insert_staff_or_own" on public.bookings;
create policy "bookings_insert_staff_or_own"
on public.bookings for insert
to authenticated
with check (
  public.has_studio_access()
  and (
    public.is_admin()
    or (
      public.profile_is_complete()
      and user_id = auth.uid()
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
    and s.starts_at >= p_from
    and s.starts_at < p_to
    and (p_type_id is null or s.type_id = p_type_id)
  order by s.starts_at;
$$;

comment on function public.list_sessions_in_range(timestamptz, timestamptz, uuid) is
  'Schedule for any signed-in user. Does not require a pass or a completed profile.';

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
    and s.id = p_id;
$$;

comment on function public.get_session_card(uuid) is
  'One schedule card for any signed-in user. Does not require a pass or a completed profile.';

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

  if not public.profile_is_complete() then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;

  -- A client without an active pass does not have studio access. Booking still
  -- spends a pass; this is not a second booking path.
  if not public.has_studio_access() then
    raise exception 'no_pass' using errcode = 'P0001';
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

  -- The caller's own cancel needs a completed profile. An admin cancel does not.
  if not public.is_admin() and not public.profile_is_complete() then
    raise exception 'profile_incomplete' using errcode = 'P0001';
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

notify pgrst, 'reload schema';
