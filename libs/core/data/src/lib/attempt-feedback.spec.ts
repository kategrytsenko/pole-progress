import { mapElementAttempt, type ElementAttemptRow } from './attempt-feedback';

describe('mapElementAttempt', () => {
  it('keeps the student attempt fields', () => {
    const row: ElementAttemptRow = {
      id: 'attempt',
      element_id: 'el',
      user_id: 'student',
      date: '2026-10-08',
      note: 'Сьогодні краще',
      stage: 'held',
      created_at: '2026-10-08T09:00:00.000Z',
    };

    expect(mapElementAttempt(row)).toEqual({
      id: 'attempt',
      element_id: 'el',
      user_id: 'student',
      date: '2026-10-08',
      note: 'Сьогодні краще',
      stage: 'held',
      created_at: '2026-10-08T09:00:00.000Z',
    });
  });
});
