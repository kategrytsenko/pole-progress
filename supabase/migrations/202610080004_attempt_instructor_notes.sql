-- One instructor comment per student attempt.
-- A separate table keeps the coach's text off element_attempts: a client
-- update of their own note or stage cannot overwrite it, and staff cannot
-- rewrite the attempt while leaving feedback.
-- is_staff() is security definer, so these policies do not re-enter profiles RLS.

create table public.attempt_instructor_notes (
  attempt_id uuid primary key references public.element_attempts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_instructor_notes_body_check check (
    char_length(btrim(body)) > 0
    and char_length(body) <= 2000
  )
);

comment on table public.attempt_instructor_notes is
  'Coach feedback for one diary attempt. Staff write it; the attempt owner can read it.';

comment on column public.attempt_instructor_notes.author_id is
  'Staff profile that last wrote the note. Null if that profile was deleted.';

create index attempt_instructor_notes_author_idx
  on public.attempt_instructor_notes (author_id);

create or replace function public.stamp_attempt_instructor_note()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.body := btrim(new.body);
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
  else
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger attempt_instructor_notes_stamp
before insert or update on public.attempt_instructor_notes
for each row
execute function public.stamp_attempt_instructor_note();

alter table public.attempt_instructor_notes enable row level security;

-- The attempt owner reads the note on their row. Staff read every note.
create policy "instructor_notes_select_staff_or_owner"
on public.attempt_instructor_notes
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.element_attempts a
    where a.id = attempt_id
      and a.user_id = auth.uid()
  )
);

-- Staff insert their own authorship. Clients have no insert policy.
create policy "instructor_notes_insert_staff"
on public.attempt_instructor_notes
for insert
to authenticated
with check (
  public.is_staff()
  and author_id = auth.uid()
);

-- Any staff member can revise a note. The new row records the editor.
create policy "instructor_notes_update_staff"
on public.attempt_instructor_notes
for update
to authenticated
using (public.is_staff())
with check (
  public.is_staff()
  and author_id = auth.uid()
);

create policy "instructor_notes_delete_staff"
on public.attempt_instructor_notes
for delete
to authenticated
using (public.is_staff());

-- A client can read the name of a coach who commented on their attempt.
-- Staff already read every profile through profiles_select_staff_or_own.
create policy "profiles_select_instructor_note_author"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.attempt_instructor_notes n
    join public.element_attempts a on a.id = n.attempt_id
    where n.author_id = profiles.id
      and a.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.attempt_instructor_notes to authenticated;
