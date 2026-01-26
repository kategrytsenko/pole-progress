create extension if not exists "pgcrypto";

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'student');
  end if;

  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type media_type as enum ('image', 'video');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id int primary key default 1,
  studio_name text not null default 'Pole Studio',
  logo_url text,
  primary_color text not null default '#7C3AED',
  created_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

create table if not exists public.element_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists element_categories_order_idx
  on public.element_categories("order");

create table if not exists public.elements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.element_categories(id) on delete cascade,
  name text not null,
  image_url text,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists elements_category_order_idx
  on public.elements(category_id, "order");

create table if not exists public.element_attempts (
  id uuid primary key default gen_random_uuid(),
  element_id uuid not null references public.elements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_date_idx
  on public.element_attempts(user_id, date desc);

create index if not exists attempts_element_user_idx
  on public.element_attempts(element_id, user_id);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.element_attempts(id) on delete cascade,
  type media_type not null,
  url text not null,
  preview_url text,
  created_at timestamptz not null default now()
);

create index if not exists media_attempt_idx
  on public.media(attempt_id);

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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;
