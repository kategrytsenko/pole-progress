create or replace function public.is_admin()
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
      and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.element_categories enable row level security;
alter table public.elements enable row level security;
alter table public.element_attempts enable row level security;
alter table public.media enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "settings_select_auth"
on public.app_settings for select
to authenticated
using (true);

create policy "settings_update_admin"
on public.app_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "cats_select_auth"
on public.element_categories for select
to authenticated
using (true);

create policy "cats_insert_admin"
on public.element_categories for insert
to authenticated
with check (public.is_admin());

create policy "cats_update_admin"
on public.element_categories for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "cats_delete_admin"
on public.element_categories for delete
to authenticated
using (public.is_admin());

create policy "elements_select_auth"
on public.elements for select
to authenticated
using (true);

create policy "elements_insert_admin"
on public.elements for insert
to authenticated
with check (public.is_admin());

create policy "elements_update_admin"
on public.elements for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "elements_delete_admin"
on public.elements for delete
to authenticated
using (public.is_admin());

create policy "attempts_select_own"
on public.element_attempts for select
to authenticated
using (user_id = auth.uid());

create policy "attempts_insert_own"
on public.element_attempts for insert
to authenticated
with check (user_id = auth.uid());

create policy "attempts_update_own"
on public.element_attempts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "attempts_delete_own"
on public.element_attempts for delete
to authenticated
using (user_id = auth.uid());

create policy "media_select_own"
on public.media for select
to authenticated
using (
  exists (
    select 1
    from public.element_attempts a
    where a.id = media.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "media_insert_own"
on public.media for insert
to authenticated
with check (
  exists (
    select 1
    from public.element_attempts a
    where a.id = media.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "media_delete_own"
on public.media for delete
to authenticated
using (
  exists (
    select 1
    from public.element_attempts a
    where a.id = media.attempt_id
      and a.user_id = auth.uid()
  )
);
