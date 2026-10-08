import {
  applyAttemptToSummary,
  compareAttemptsChronologically,
  stageDirection,
  summarizeElementStages,
} from './attempt-stage';
import type { AttemptProgressRow } from './models';

function row(
  partial: Pick<AttemptProgressRow, 'element_id' | 'stage' | 'date' | 'created_at'>,
): AttemptProgressRow {
  return partial;
}

describe('attempt stages', () => {
  it('orders attempts by date, then by insert time', () => {
    const older = row({
      element_id: 'el',
      stage: 'trying',
      date: '2026-10-01',
      created_at: '2026-10-01T18:00:00.000Z',
    });
    const laterSameDay = row({
      element_id: 'el',
      stage: 'held',
      date: '2026-10-01',
      created_at: '2026-10-01T19:00:00.000Z',
    });
    const nextDay = row({
      element_id: 'el',
      stage: 'in_progress',
      date: '2026-10-02',
      created_at: '2026-10-02T10:00:00.000Z',
    });

    expect(compareAttemptsChronologically(older, laterSameDay)).toBeLessThan(0);
    expect(compareAttemptsChronologically(laterSameDay, nextDay)).toBeLessThan(0);
    expect(compareAttemptsChronologically(older, older)).toBe(0);
  });

  it('names forward, same, and backward stage changes', () => {
    expect(stageDirection('trying', 'held')).toBe('forward');
    expect(stageDirection('held', 'held')).toBe('same');
    expect(stageDirection('mastered', 'in_progress')).toBe('back');
  });

  it('keeps the newest attempt stage, including a later regression', () => {
    const summaries = summarizeElementStages([
      row({
        element_id: 'spin',
        stage: 'trying',
        date: '2026-09-01',
        created_at: '2026-09-01T10:00:00.000Z',
      }),
      row({
        element_id: 'spin',
        stage: 'mastered',
        date: '2026-09-10',
        created_at: '2026-09-10T10:00:00.000Z',
      }),
      row({
        element_id: 'spin',
        stage: 'held',
        date: '2026-10-01',
        created_at: '2026-10-01T10:00:00.000Z',
      }),
      row({
        element_id: 'ayesha',
        stage: 'in_progress',
        date: '2026-10-02',
        created_at: '2026-10-02T10:00:00.000Z',
      }),
    ]);

    expect(summaries.get('spin')).toEqual({
      stage: 'held',
      attemptCount: 3,
      date: '2026-10-01',
      createdAt: '2026-10-01T10:00:00.000Z',
    });
    expect(summaries.get('ayesha')?.stage).toBe('in_progress');
    expect(summaries.get('ayesha')?.attemptCount).toBe(1);
  });

  it('does not replace the current stage when a backdated attempt is logged', () => {
    const current = applyAttemptToSummary(undefined, {
      element_id: 'spin',
      stage: 'held',
      date: '2026-10-08',
      created_at: '2026-10-08T12:00:00.000Z',
    });

    const next = applyAttemptToSummary(current, {
      element_id: 'spin',
      stage: 'trying',
      date: '2026-09-01',
      created_at: '2026-10-08T12:05:00.000Z',
    });

    expect(next.stage).toBe('held');
    expect(next.attemptCount).toBe(2);
    expect(next.date).toBe('2026-10-08');
  });
});
