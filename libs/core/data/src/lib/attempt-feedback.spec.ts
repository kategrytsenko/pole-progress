import { instructorNoteBody, mapElementAttempt, readInstructorFeedback } from './attempt-feedback';
import type { ElementAttemptRow } from './attempt-feedback';

describe('instructor feedback', () => {
  it('reads a coach note, including a one-element embed array', () => {
    const note = {
      author_id: 'coach',
      body: '  Тримай корпус ближче до жердини  ',
      updated_at: '2026-10-08T12:00:00.000Z',
      author: { name: '  Оля  ' },
    };

    expect(readInstructorFeedback(note)).toEqual({
      author_id: 'coach',
      author_name: 'Оля',
      body: 'Тримай корпус ближче до жердини',
      updated_at: '2026-10-08T12:00:00.000Z',
    });
    expect(readInstructorFeedback([note])).toEqual(readInstructorFeedback(note));
  });

  it('treats a missing or blank note as no feedback', () => {
    expect(readInstructorFeedback(null)).toBeNull();
    expect(readInstructorFeedback([])).toBeNull();
    expect(
      readInstructorFeedback({
        author_id: 'coach',
        body: '   ',
        updated_at: '2026-10-08T12:00:00.000Z',
        author: { name: 'Оля' },
      }),
    ).toBeNull();
  });

  it('keeps the student attempt and attaches feedback beside it', () => {
    const row: ElementAttemptRow = {
      id: 'attempt',
      element_id: 'el',
      user_id: 'student',
      date: '2026-10-08',
      note: 'Сьогодні краще',
      stage: 'held',
      created_at: '2026-10-08T09:00:00.000Z',
      attempt_instructor_notes: {
        author_id: null,
        body: 'Ще трохи вище руки',
        updated_at: '2026-10-08T18:00:00.000Z',
        author: { name: ' ' },
      },
    };

    expect(mapElementAttempt(row)).toEqual({
      id: 'attempt',
      element_id: 'el',
      user_id: 'student',
      date: '2026-10-08',
      note: 'Сьогодні краще',
      stage: 'held',
      created_at: '2026-10-08T09:00:00.000Z',
      instructor_feedback: {
        author_id: null,
        author_name: null,
        body: 'Ще трохи вище руки',
        updated_at: '2026-10-08T18:00:00.000Z',
      },
    });
  });

  it('rejects an empty or oversized instructor note before it is saved', () => {
    expect(instructorNoteBody('  Добре  ')).toBe('Добре');
    expect(() => instructorNoteBody('   ')).toThrow(/empty/);
    expect(() => instructorNoteBody('а'.repeat(2001))).toThrow(/too long/);
  });
});
