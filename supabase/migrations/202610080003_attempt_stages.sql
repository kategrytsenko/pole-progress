-- Diary stages on each student attempt.
-- Existing rows default to 'trying' so the timeline stays readable before anyone re-logs them.

create type public.attempt_stage as enum (
  'trying',
  'in_progress',
  'held',
  'mastered'
);

alter table public.element_attempts
  add column stage public.attempt_stage not null default 'trying';

comment on column public.element_attempts.stage is
  'Student self-assessment for this attempt: trying, in_progress, held, or mastered.';
