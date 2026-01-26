-- Allow authenticated to use schema
grant usage on schema public to authenticated;

-- Read catalog + settings for all authenticated users
grant select on public.app_settings to authenticated;
grant select on public.element_categories to authenticated;
grant select on public.elements to authenticated;

-- Profiles: user reads/updates own row
grant select, update on public.profiles to authenticated;

-- Attempts/media
grant select, insert, update, delete on public.element_attempts to authenticated;
grant select, insert, delete on public.media to authenticated;

-- Catalog CRUD (admin via RLS)
grant insert, update, delete on public.element_categories to authenticated;
grant insert, update, delete on public.elements to authenticated;

-- Settings update (admin via RLS)
grant update on public.app_settings to authenticated;

-- 🔥 ВАЖЛИВО: allow RLS helper function
grant execute on function public.is_admin() to authenticated;
