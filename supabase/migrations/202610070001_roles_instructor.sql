-- Instructor role and staff helpers.
-- Compare roles as text so this file can add the enum value and use it
-- in the same migration transaction (Postgres rejects the new label until commit).

alter type public.user_role add value if not exists 'instructor';

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'instructor'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_instructor();
$$;

-- Stored role for a profile, bypassing RLS. The update policy compares the
-- incoming role to this value so a client cannot change their own role.
create or replace function public.profile_role_text(profile_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text
  from public.profiles p
  where p.id = profile_id;
$$;

grant execute on function public.is_instructor() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.profile_role_text(uuid) to authenticated;

-- Staff can read every profile. Clients still read only their own row.
drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_staff_or_own"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_staff());

-- Admins can update any profile, including role.
-- Everyone else can update only their own row, and only when role is unchanged.
drop policy if exists "profiles_update_own" on public.profiles;

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
