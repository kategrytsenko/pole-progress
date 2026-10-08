import type { AttemptInstructorFeedback, AttemptStage, ElementAttempt } from './models';

const MAX_INSTRUCTOR_NOTE_LENGTH = 2000;

export interface ElementAttemptRow {
  id: string;
  element_id: string;
  user_id: string;
  date: string;
  note: string | null;
  stage: AttemptStage;
  created_at: string;
  attempt_instructor_notes: unknown;
}

export function instructorNoteBody(value: string): string {
  const body = value.trim();
  if (body.length === 0) throw new Error('Instructor note cannot be empty');
  if (body.length > MAX_INSTRUCTOR_NOTE_LENGTH) throw new Error('Instructor note is too long');
  return body;
}

/** Maps the embedded attempt_instructor_notes object (or a one-element array) onto the attempt. */
export function readInstructorFeedback(value: unknown): AttemptInstructorFeedback | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (typeof row !== 'object' || row === null) return null;

  const record = row as Record<string, unknown>;
  if (typeof record['body'] !== 'string') return null;
  const body = record['body'].trim();
  if (body.length === 0) return null;

  const updatedAt = record['updated_at'];
  if (typeof updatedAt !== 'string' || updatedAt.length === 0) return null;

  const authorId = record['author_id'];
  return {
    author_id: typeof authorId === 'string' ? authorId : null,
    author_name: readAuthorName(record['author']),
    body,
    updated_at: updatedAt,
  };
}

export function mapElementAttempt(row: ElementAttemptRow): ElementAttempt {
  return {
    id: row.id,
    element_id: row.element_id,
    user_id: row.user_id,
    date: row.date,
    note: row.note,
    stage: row.stage,
    created_at: row.created_at,
    instructor_feedback: readInstructorFeedback(row.attempt_instructor_notes),
  };
}

function readAuthorName(value: unknown): string | null {
  const author = Array.isArray(value) ? value[0] : value;
  if (typeof author !== 'object' || author === null) return null;
  const name = (author as Record<string, unknown>)['name'];
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}
