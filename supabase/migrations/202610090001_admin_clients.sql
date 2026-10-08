-- Admin client management.
-- profiles.role changes already require is_admin().
-- Issuing and renewing a pass is admin-only too. book_session / cancel_booking
-- still adjust remaining as security definer, so class booking is unchanged.
-- Staff keep read access so instructors can see a client's pass.

drop policy if exists "client_passes_insert_staff" on public.client_passes;
drop policy if exists "client_passes_insert_admin" on public.client_passes;
create policy "client_passes_insert_admin"
on public.client_passes for insert
to authenticated
with check (public.is_admin());

drop policy if exists "client_passes_update_staff" on public.client_passes;
drop policy if exists "client_passes_update_admin" on public.client_passes;
create policy "client_passes_update_admin"
on public.client_passes for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Emails live on auth.users, not profiles. Only an admin receives rows.
create or replace function public.admin_profile_emails()
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text
  from auth.users u
  where public.is_admin();
$$;

revoke all on function public.admin_profile_emails() from public, anon;
grant execute on function public.admin_profile_emails() to authenticated;
