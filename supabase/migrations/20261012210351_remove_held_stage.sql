-- Remove the held diary stage. Existing holds become in_progress.
-- Postgres cannot drop an enum label in place. Rebuild attempt_stage without held.

update public.element_attempts
set stage = 'in_progress'
where stage::text = 'held';

alter table public.element_attempts
  alter column stage drop default;

alter type public.attempt_stage rename to attempt_stage_old;

create type public.attempt_stage as enum (
  'trying',
  'in_progress',
  'mastered'
);

alter table public.element_attempts
  alter column stage type public.attempt_stage
  using (
    case stage::text
      when 'held' then 'in_progress'
      else stage::text
    end
  )::public.attempt_stage;

alter table public.element_attempts
  alter column stage set default 'trying'::public.attempt_stage;

drop type public.attempt_stage_old;

comment on column public.element_attempts.stage is
  'Student self-assessment for this attempt: trying, in_progress, or mastered.';
