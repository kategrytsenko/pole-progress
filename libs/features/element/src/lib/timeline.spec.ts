import type { ElementAttempt } from '@org/data';
import { buildAttemptTimeline } from './timeline';

function attempt(
  partial: Pick<ElementAttempt, 'id' | 'date' | 'stage' | 'created_at'>,
): ElementAttempt {
  return {
    element_id: 'el',
    user_id: 'user',
    note: null,
    ...partial,
  };
}

describe('attempt timeline', () => {
  it('sorts oldest first and marks stage progression beside each entry', () => {
    const first = attempt({
      id: 'a',
      date: '2026-10-02',
      stage: 'trying',
      created_at: '2026-10-02T10:00:00.000Z',
    });
    const second = attempt({
      id: 'b',
      date: '2026-10-01',
      stage: 'in_progress',
      created_at: '2026-10-01T10:00:00.000Z',
    });
    const third = attempt({
      id: 'c',
      date: '2026-10-03',
      stage: 'trying',
      created_at: '2026-10-03T10:00:00.000Z',
    });

    const media = new Map<string, readonly { id: string }[]>([
      ['a', [{ id: 'photo' }]],
      ['c', []],
    ]);

    const timeline = buildAttemptTimeline([first, second, third], media);

    expect(timeline.map((entry) => entry.attempt.id)).toEqual(['b', 'a', 'c']);
    expect(timeline[0]?.direction).toBeNull();
    expect(timeline[0]?.previousStage).toBeNull();
    expect(timeline[1]?.direction).toBe('back');
    expect(timeline[1]?.previousStage).toBe('in_progress');
    expect(timeline[1]?.media).toEqual([{ id: 'photo' }]);
    expect(timeline[2]?.direction).toBe('same');
    expect(timeline[2]?.media).toEqual([]);
  });
});
