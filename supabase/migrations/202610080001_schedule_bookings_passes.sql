-- Schedule, bookings, and passes. Booking RPCs land in a later migration.
-- Capacity and credit deduction are not enforced here.

alter table public.app_settings
  add column default_capacity integer not null default 12,
  add column cancel_cutoff_hours integer not null default 12;

alter table public.app_settings
  add constraint app_settings_default_capacity_positive check (default_capacity > 0),
  add constraint app_settings_cancel_cutoff_hours_nonnegative check (cancel_cutoff_hours >= 0);

create type public.class_session_status as enum ('scheduled', 'cancelled');
create type public.booking_status as enum ('booked', 'cancelled');
create type public.client_pass_status as enum ('active', 'exhausted', 'expired', 'revoked');

create table public.class_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_min integer not null,
  default_capacity integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint class_types_duration_positive check (duration_min > 0),
  constraint class_types_capacity_positive check (default_capacity > 0)
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references public.class_types(id) on delete restrict,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null,
  status public.class_session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  constraint class_sessions_capacity_positive check (capacity > 0),
  constraint class_sessions_time_order check (ends_at > starts_at)
);

create index class_sessions_starts_at_idx
  on public.class_sessions (starts_at);

create index class_sessions_instructor_starts_idx
  on public.class_sessions (instructor_id, starts_at);

create index class_sessions_type_id_idx
  on public.class_sessions (type_id);

create table public.pass_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_count integer not null,
  validity_days integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pass_products_class_count_positive check (class_count > 0),
  constraint pass_products_validity_positive check (validity_days > 0)
);

create table public.client_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.pass_products(id) on delete restrict,
  remaining integer not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  status public.client_pass_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint client_passes_remaining_nonnegative check (remaining >= 0),
  constraint client_passes_validity_order check (valid_until >= valid_from)
);

create index client_passes_user_status_idx
  on public.client_passes (user_id, status);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pass_id uuid not null references public.client_passes(id) on delete restrict,
  status public.booking_status not null default 'booked',
  created_at timestamptz not null default now()
);

create index bookings_session_idx
  on public.bookings (session_id);

create index bookings_user_idx
  on public.bookings (user_id);

create unique index bookings_one_active_per_user_session_idx
  on public.bookings (session_id, user_id)
  where status = 'booked';

grant select, insert, update, delete on public.class_types to authenticated;
grant select, insert, update, delete on public.class_sessions to authenticated;
grant select, insert, update, delete on public.pass_products to authenticated;
grant select, insert, update, delete on public.client_passes to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;

alter table public.class_types enable row level security;
alter table public.class_sessions enable row level security;
alter table public.pass_products enable row level security;
alter table public.client_passes enable row level security;
alter table public.bookings enable row level security;

-- Schedule and products are studio-wide reads. Writes are staff.
create policy "class_types_select_auth"
on public.class_types for select
to authenticated
using (true);

create policy "class_types_insert_staff"
on public.class_types for insert
to authenticated
with check (public.is_staff());

create policy "class_types_update_staff"
on public.class_types for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "class_types_delete_staff"
on public.class_types for delete
to authenticated
using (public.is_staff());

create policy "class_sessions_select_auth"
on public.class_sessions for select
to authenticated
using (true);

create policy "class_sessions_insert_staff"
on public.class_sessions for insert
to authenticated
with check (public.is_staff());

create policy "class_sessions_update_staff"
on public.class_sessions for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "class_sessions_delete_staff"
on public.class_sessions for delete
to authenticated
using (public.is_staff());

create policy "pass_products_select_auth"
on public.pass_products for select
to authenticated
using (true);

create policy "pass_products_insert_staff"
on public.pass_products for insert
to authenticated
with check (public.is_staff());

create policy "pass_products_update_staff"
on public.pass_products for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "pass_products_delete_staff"
on public.pass_products for delete
to authenticated
using (public.is_staff());

-- Students read their own passes. Staff manage every pass.
create policy "client_passes_select_staff_or_own"
on public.client_passes for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "client_passes_insert_staff"
on public.client_passes for insert
to authenticated
with check (public.is_staff());

create policy "client_passes_update_staff"
on public.client_passes for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "client_passes_delete_staff"
on public.client_passes for delete
to authenticated
using (public.is_staff());

-- Students read their own rows and can insert a booked row for themselves.
-- Staff manage every booking. Cancellation credit rules come with the RPC.
create policy "bookings_select_staff_or_own"
on public.bookings for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "bookings_insert_staff_or_own"
on public.bookings for insert
to authenticated
with check (
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
);

create policy "bookings_update_staff"
on public.bookings for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "bookings_delete_staff"
on public.bookings for delete
to authenticated
using (public.is_staff());

-- Demo instructor and client so sessions and the client pass have profile rows.
-- Local only. Password is "demo-local-only".
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'authenticated',
    'authenticated',
    'instructor.demo@pole.local',
    extensions.crypt('demo-local-only', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'name', 'Демо інструктор',
      'email', 'instructor.demo@pole.local',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'authenticated',
    'authenticated',
    'client.demo@pole.local',
    extensions.crypt('demo-local-only', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'name', 'Демо клієнт',
      'email', 'client.demo@pole.local',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'email',
    jsonb_build_object(
      'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'email', 'instructor.demo@pole.local',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'email',
    jsonb_build_object(
      'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'email', 'client.demo@pole.local',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    now()
  );

update public.profiles
set name = 'Демо інструктор',
    role = 'instructor'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

update public.profiles
set name = 'Демо клієнт'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

insert into public.class_types (id, name, duration_min, default_capacity, active)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Базовий pole', 60, 12, true),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Exotic', 55, 10, true);

-- One session each day of the current ISO week (Europe/Kyiv).
insert into public.class_sessions (
  type_id,
  instructor_id,
  starts_at,
  ends_at,
  capacity,
  status
)
select
  s.type_id,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  ((w.week_start + s.day_offset) + s.start_time) at time zone 'Europe/Kyiv',
  ((w.week_start + s.day_offset) + s.start_time) at time zone 'Europe/Kyiv'
    + make_interval(mins => ct.duration_min),
  ct.default_capacity,
  'scheduled'
from (
  select date_trunc('week', timezone('Europe/Kyiv', now()))::date as week_start
) w
cross join (
  values
    (0, time '18:00', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid),
    (1, time '19:00', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid),
    (2, time '18:00', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid),
    (3, time '19:00', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid),
    (4, time '18:00', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid),
    (5, time '11:00', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid),
    (6, time '12:00', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid)
) as s(day_offset, start_time, type_id)
join public.class_types ct on ct.id = s.type_id;

insert into public.pass_products (id, name, class_count, validity_days, active)
values ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'Абонемент 8', 8, 30, true);

insert into public.client_passes (
  id,
  user_id,
  product_id,
  remaining,
  valid_from,
  valid_until,
  status
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  8,
  now(),
  now() + interval '30 days',
  'active'
);
