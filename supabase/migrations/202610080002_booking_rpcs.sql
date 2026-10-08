-- Book and cancel are atomic in the database. Clients cannot update
-- bookings or pass balances under RLS, and they cannot see other people's
-- bookings or instructor profiles, so the calendar count and instructor
-- name come from these security-definer functions.

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

  -- A studio-cancelled class always returns the credit. Otherwise the
  -- credit comes back only when cancellation is still before the cutoff.
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

revoke all on function public.list_sessions_in_range(timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.get_session_card(uuid) from public, anon, authenticated;
revoke all on function public.book_session(uuid) from public, anon, authenticated;
revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;

grant execute on function public.list_sessions_in_range(timestamptz, timestamptz, uuid) to authenticated, service_role;
grant execute on function public.get_session_card(uuid) to authenticated, service_role;
grant execute on function public.book_session(uuid) to authenticated, service_role;
grant execute on function public.cancel_booking(uuid) to authenticated, service_role;
