-- Public journals. Default stays private.
-- A peer with studio access can read attempts, media, likes, and comments
-- only while profiles.journal_public is true. Flipping it back hides those
-- rows immediately. Existing likes and comments stay for the owner and staff.
-- Students still write only their own attempts. Staff policies are unchanged.
--
-- Helpers live in the private schema so PostgREST does not expose them.
-- They are security definer to read journal_public without re-entering RLS.

alter table public.profiles
  add column journal_public boolean not null default false;

comment on column public.profiles.journal_public is
  'When true, other clients with studio access can read this diary, its media, likes, and comments.';

create index profiles_public_journal_idx
  on public.profiles (name)
  where journal_public;

-- Peers can read a profile that opted in, so the journals list can show a name.
-- Staff and the owner keep profiles_select_staff_or_own.
create policy "profiles_select_public_journal"
on public.profiles
for select
to authenticated
using (
  journal_public = true
  and public.has_studio_access()
);

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.journal_is_public(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.journal_public
      from public.profiles p
      where p.id = owner_id
    ),
    false
  );
$$;

create or replace function private.attempt_owner(attempt uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.user_id
  from public.element_attempts a
  where a.id = attempt;
$$;

-- Storage object names are user/{uid}/attempt/{attemptId}/...
-- Compare the uid folder as text so a non-uuid segment does not abort the policy.
create or replace function private.journal_is_public_folder(folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select folder is not null
    and exists (
      select 1
      from public.profiles p
      where p.id::text = folder
        and p.journal_public
    );
$$;

-- Owner (with studio access), staff, or a peer while the journal is public.
create or replace function private.viewer_can_read_attempt(attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.has_studio_access()
    and exists (
      select 1
      from public.element_attempts a
      where a.id = attempt
        and (
          a.user_id = auth.uid()
          or public.is_staff()
          or private.journal_is_public(a.user_id)
        )
    );
$$;

revoke all on function private.journal_is_public(uuid) from public;
revoke all on function private.attempt_owner(uuid) from public;
revoke all on function private.journal_is_public_folder(text) from public;
revoke all on function private.viewer_can_read_attempt(uuid) from public;

grant execute on function private.journal_is_public(uuid) to authenticated;
grant execute on function private.attempt_owner(uuid) to authenticated;
grant execute on function private.journal_is_public_folder(text) to authenticated;
grant execute on function private.viewer_can_read_attempt(uuid) to authenticated;

create policy "attempts_select_public_journal"
on public.element_attempts
for select
to authenticated
using (
  public.has_studio_access()
  and private.journal_is_public(user_id)
);

create policy "media_select_public_journal"
on public.media
for select
to authenticated
using (
  public.has_studio_access()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

create policy "media_objects_select_public_journal"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and public.has_studio_access()
  and (storage.foldername(name))[1] = 'user'
  and private.journal_is_public_folder((storage.foldername(name))[2])
);

create table public.attempt_likes (
  attempt_id uuid not null references public.element_attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (attempt_id, user_id)
);

comment on table public.attempt_likes is
  'One like per user on someone else''s attempt. Delete the row to unlike.';

create table public.attempt_comments (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.element_attempts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_comments_body_check check (
    char_length(btrim(body)) > 0
    and char_length(body) <= 2000
  )
);

comment on table public.attempt_comments is
  'Peer comments on a diary attempt. Not instructor feedback.';

comment on column public.attempt_comments.author_id is
  'Profile that wrote the comment. Null if that profile was deleted.';

create index attempt_comments_attempt_created_idx
  on public.attempt_comments (attempt_id, created_at);

create index attempt_comments_author_idx
  on public.attempt_comments (author_id);

create or replace function public.stamp_attempt_comment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.attempt_id := old.attempt_id;
    new.author_id := old.author_id;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;

  new.body := btrim(new.body);
  new.updated_at := now();
  return new;
end;
$$;

create trigger attempt_comments_stamp
before insert or update on public.attempt_comments
for each row
execute function public.stamp_attempt_comment();

alter table public.attempt_likes enable row level security;
alter table public.attempt_comments enable row level security;

create policy "likes_select_visible_attempt"
on public.attempt_likes
for select
to authenticated
using (private.viewer_can_read_attempt(attempt_id));

create policy "likes_insert_public_journal"
on public.attempt_likes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_studio_access()
  and private.attempt_owner(attempt_id) is not null
  and private.attempt_owner(attempt_id) is distinct from auth.uid()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

create policy "likes_delete_own_public_journal"
on public.attempt_likes
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.has_studio_access()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

create policy "comments_select_visible_attempt"
on public.attempt_comments
for select
to authenticated
using (private.viewer_can_read_attempt(attempt_id));

create policy "comments_insert_public_journal"
on public.attempt_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.has_studio_access()
  and private.attempt_owner(attempt_id) is not null
  and private.attempt_owner(attempt_id) is distinct from auth.uid()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

create policy "comments_update_author"
on public.attempt_comments
for update
to authenticated
using (
  author_id = auth.uid()
  and public.has_studio_access()
  and private.journal_is_public(private.attempt_owner(attempt_id))
)
with check (
  author_id = auth.uid()
  and public.has_studio_access()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

create policy "comments_delete_author"
on public.attempt_comments
for delete
to authenticated
using (
  author_id = auth.uid()
  and public.has_studio_access()
  and private.journal_is_public(private.attempt_owner(attempt_id))
);

create policy "comments_delete_attempt_owner"
on public.attempt_comments
for delete
to authenticated
using (private.attempt_owner(attempt_id) = auth.uid());

-- A private journal still shows the commenter's name to people who can read
-- that comment: the attempt owner, staff, or a peer while the journal is public.
-- This does not open every profile. Staff already have profiles_select_staff_or_own.
create policy "profiles_select_attempt_comment_author"
on public.profiles
for select
to authenticated
using (
  public.has_studio_access()
  and exists (
    select 1
    from public.attempt_comments c
    where c.author_id = profiles.id
      and private.viewer_can_read_attempt(c.attempt_id)
  )
);

grant select, insert, delete on public.attempt_likes to authenticated;
grant select, insert, update, delete on public.attempt_comments to authenticated;
