-- Profile completion: a nullable phone, and a check that reads only the signed-in user.
-- Existing rows stay valid with phone null. No numbers are invented.
-- Phone is not a table-level SELECT privilege. Revoking only the column still
-- leaves a table SELECT in force, so the table grant is replaced with an
-- explicit column list that omits phone. The owner reads their number through
-- own_profile_phone(). An admin read for the client directory is later.
-- Role changes stay on profiles_update_admin_or_own. This file does not
-- change studio access, booking, or journal policies.

alter table public.profiles
  add column phone text;

alter table public.profiles
  add constraint profiles_phone_not_blank check (
    phone is null
    or (
      char_length(phone) <= 40
      and regexp_replace(phone, '^[[:space:]]+|[[:space:]]+$', '', 'g') <> ''
    )
  );

comment on column public.profiles.phone is
  'Contact number for the profile owner. Null until they save one. Not selectable by anon or authenticated; own_profile_phone() returns the signed-in user''s value.';

revoke select on table public.profiles from PUBLIC, anon, authenticated;

grant select (id, name, role, created_at, journal_public)
  on table public.profiles
  to authenticated;

-- Completion ignores a client-supplied user id. Whitespace-only text is incomplete.
create or replace function public.profile_is_complete()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and regexp_replace(coalesce(p.name, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g') <> ''
      and regexp_replace(coalesce(p.phone, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g') <> ''
  );
$$;

comment on function public.profile_is_complete() is
  'True when the signed-in profile has a name and phone that are non-empty after trimming whitespace.';

revoke all on function public.profile_is_complete() from public, anon;
grant execute on function public.profile_is_complete() to authenticated;

create or replace function public.own_profile_phone()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.phone
  from public.profiles p
  where p.id = (select auth.uid());
$$;

comment on function public.own_profile_phone() is
  'Phone of the signed-in profile. Does not accept a user id and does not return another profile''s number.';

revoke all on function public.own_profile_phone() from public, anon;
grant execute on function public.own_profile_phone() to authenticated;

notify pgrst, 'reload schema';
