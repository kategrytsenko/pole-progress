import type { AttemptProgressRow, AttemptStage, ElementAttempt } from './models';

/** Earliest stage first. Index is the progression rank. */
export const ATTEMPT_STAGES: readonly AttemptStage[] = [
  'trying',
  'in_progress',
  'held',
  'mastered',
];

export const ATTEMPT_STAGE_LABELS: Record<AttemptStage, string> = {
  trying: 'Пробую',
  in_progress: 'В процесі',
  held: 'Утримую',
  mastered: 'Опановано',
};

export const ATTEMPT_STAGE_HINTS: Record<AttemptStage, string> = {
  trying: 'Ще шукаю положення і не тримаю елемент.',
  in_progress: 'Рух збирається, але ще нестабільно.',
  held: 'Можу утримати елемент.',
  mastered: 'Повторюю впевнено.',
};

export const ATTEMPT_STAGE_PILL_CLASS: Record<AttemptStage, string> = {
  trying: 'bg-neutral-100 text-neutral-700',
  in_progress: 'bg-amber-100 text-amber-900',
  held: 'bg-sky-100 text-sky-900',
  mastered: 'bg-primary/10 text-primary',
};

export const ATTEMPT_STAGE_MARK_CLASS: Record<AttemptStage, string> = {
  trying: 'bg-neutral-400',
  in_progress: 'bg-amber-500',
  held: 'bg-sky-500',
  mastered: 'bg-primary',
};

export const ATTEMPT_STAGE_RING_CLASS: Record<AttemptStage, string> = {
  trying: 'ring-neutral-300',
  in_progress: 'ring-amber-400',
  held: 'ring-sky-400',
  mastered: 'ring-primary',
};

export function stageRank(stage: AttemptStage): number {
  const index = ATTEMPT_STAGES.indexOf(stage);
  return index === -1 ? 0 : index;
}

export type StageDirection = 'forward' | 'same' | 'back';

export function stageDirection(from: AttemptStage, to: AttemptStage): StageDirection {
  const delta = stageRank(to) - stageRank(from);
  if (delta > 0) return 'forward';
  if (delta < 0) return 'back';
  return 'same';
}

/** Oldest attempt first. Date wins, then insert time. */
export function compareAttemptsChronologically(
  a: Pick<ElementAttempt, 'date' | 'created_at'>,
  b: Pick<ElementAttempt, 'date' | 'created_at'>,
): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return 0;
}

export interface ElementStageSummary {
  readonly stage: AttemptStage;
  readonly attemptCount: number;
  readonly date: string;
  readonly createdAt: string;
}

export function applyAttemptToSummary(
  current: ElementStageSummary | undefined,
  attempt: AttemptProgressRow,
): ElementStageSummary {
  if (!current) {
    return {
      stage: attempt.stage,
      attemptCount: 1,
      date: attempt.date,
      createdAt: attempt.created_at,
    };
  }

  const newer =
    compareAttemptsChronologically(attempt, {
      date: current.date,
      created_at: current.createdAt,
    }) > 0;

  return {
    stage: newer ? attempt.stage : current.stage,
    attemptCount: current.attemptCount + 1,
    date: newer ? attempt.date : current.date,
    createdAt: newer ? attempt.created_at : current.createdAt,
  };
}

/** Latest attempt by date defines the stage. A newer lower stage replaces an older higher one. */
export function summarizeElementStages(
  rows: readonly AttemptProgressRow[],
): Map<string, ElementStageSummary> {
  const summaries = new Map<string, ElementStageSummary>();

  for (const row of rows) {
    summaries.set(row.element_id, applyAttemptToSummary(summaries.get(row.element_id), row));
  }

  return summaries;
}
