import {
  compareAttemptsChronologically,
  stageDirection,
  type AttemptStage,
  type ElementAttempt,
  type StageDirection,
} from '@org/data';

export interface AttemptTimelineEntry<TMedia> {
  readonly attempt: ElementAttempt;
  readonly media: readonly TMedia[];
  readonly previousStage: AttemptStage | null;
  readonly direction: StageDirection | null;
}

/** Oldest attempt first, so stage changes read as a diary. */
export function buildAttemptTimeline<TMedia>(
  attempts: readonly ElementAttempt[],
  mediaByAttempt: ReadonlyMap<string, readonly TMedia[]>,
): AttemptTimelineEntry<TMedia>[] {
  const sorted = [...attempts].sort(compareAttemptsChronologically);

  return sorted.map((attempt, index) => {
    const previous = index > 0 ? sorted[index - 1] : undefined;
    return {
      attempt,
      media: mediaByAttempt.get(attempt.id) ?? [],
      previousStage: previous?.stage ?? null,
      direction: previous ? stageDirection(previous.stage, attempt.stage) : null,
    };
  });
}
