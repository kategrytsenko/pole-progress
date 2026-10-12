import type { AttemptStage, ElementAttempt } from './models';

export interface ElementAttemptRow {
  id: string;
  element_id: string;
  user_id: string;
  date: string;
  note: string | null;
  stage: AttemptStage;
  created_at: string;
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
  };
}
