import { KYIV_TIME_GAP_MESSAGE } from './kyiv-time';
import type { ClassType } from './models';
import {
  ADMIN_WRITE_DENIED,
  applySessionCancel,
  CAPACITY_INVALID,
  capacityError,
  CLASS_TYPE_NAME_REQUIRED,
  classTypeWrite,
  classTypesForClientFilter,
  classTypesForSessionForm,
  DURATION_INVALID,
  instructorChoices,
  newSessionInsert,
  sessionCancelPatch,
  sessionCancelPrompt,
  sessionChangeNeedsConfirmation,
  sessionDefaultsFromType,
  sessionDraftFromCard,
  sessionListRange,
  sessionReschedulePrompt,
  sessionTypeIsOffered,
  sessionWrite,
  sessionWriteErrorMessage,
  sortSessionsByStart,
} from './session-admin';

const pole: ClassType = {
  id: 'pole',
  name: 'Базовий pole',
  duration_min: 60,
  default_capacity: 12,
  active: true,
  created_at: '2026-10-01T00:00:00.000Z',
};

const draft = {
  typeId: 'pole',
  instructorId: 'teacher-a',
  date: '2026-10-26',
  startTime: '18:00',
  durationMin: 55,
  capacity: 10,
};

describe('class types', () => {
  it('creates and edits a type with name, duration, capacity, and active status', () => {
    expect(
      classTypeWrite({ name: '  Розтяжка  ', durationMin: 45, defaultCapacity: 8, active: true }),
    ).toEqual({
      ok: true,
      value: { name: 'Розтяжка', duration_min: 45, default_capacity: 8, active: true },
    });

    expect(
      classTypeWrite({ name: 'Розтяжка', durationMin: '50', defaultCapacity: '6', active: false }),
    ).toEqual({
      ok: true,
      value: { name: 'Розтяжка', duration_min: 50, default_capacity: 6, active: false },
    });
  });

  it('rejects an empty name and a non-positive duration or capacity', () => {
    expect(classTypeWrite({ name: '   ', durationMin: 45, defaultCapacity: 8, active: true })).toEqual({
      ok: false,
      error: CLASS_TYPE_NAME_REQUIRED,
    });
    expect(classTypeWrite({ name: 'Розтяжка', durationMin: 0, defaultCapacity: 8, active: true }).ok).toBe(
      false,
    );
    expect(
      classTypeWrite({ name: 'Розтяжка', durationMin: -5, defaultCapacity: 8, active: true }),
    ).toMatchObject({ error: DURATION_INVALID });
    expect(
      classTypeWrite({ name: 'Розтяжка', durationMin: 1.5, defaultCapacity: 8, active: true }),
    ).toMatchObject({ error: DURATION_INVALID });
    expect(
      classTypeWrite({ name: 'Розтяжка', durationMin: 45, defaultCapacity: 0, active: true }),
    ).toMatchObject({ error: CAPACITY_INVALID });
  });

  it('offers only active types for a new session and keeps the current type while editing', () => {
    const retired: ClassType = { ...pole, id: 'retired', name: 'Архів', active: false };
    expect(classTypesForClientFilter([pole, retired])).toEqual([pole]);
    expect(classTypesForSessionForm([pole, retired], null).map((type) => type.id)).toEqual(['pole']);
    expect(classTypesForSessionForm([pole, retired], 'retired').map((type) => type.id)).toEqual([
      'pole',
      'retired',
    ]);
    expect(sessionDefaultsFromType(pole)).toEqual({ durationMin: 60, capacity: 12 });
    expect(sessionTypeIsOffered([pole, retired], 'retired', null)).toBe(false);
    expect(sessionTypeIsOffered([pole, retired], 'retired', 'retired')).toBe(true);
  });
});

describe('sessions', () => {
  it('creates a scheduled session and edits it without changing status', () => {
    const created = newSessionInsert(draft);
    expect(created).toEqual({
      ok: true,
      value: {
        type_id: 'pole',
        instructor_id: 'teacher-a',
        starts_at: '2026-10-26T16:00:00.000Z',
        ends_at: '2026-10-26T16:55:00.000Z',
        capacity: 10,
        status: 'scheduled',
      },
    });

    const edited = sessionWrite(
      { ...draft, instructorId: 'teacher-b', startTime: '19:00', durationMin: 50, capacity: 9 },
      2,
    );
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.value).toEqual({
      type_id: 'pole',
      instructor_id: 'teacher-b',
      starts_at: '2026-10-26T17:00:00.000Z',
      ends_at: '2026-10-26T17:50:00.000Z',
      capacity: 9,
    });
    expect(edited.value).not.toHaveProperty('status');
  });

  it('rejects a non-positive duration or capacity and a missing hour during the spring change', () => {
    expect(sessionWrite({ ...draft, durationMin: 0 }, 0)).toMatchObject({ error: DURATION_INVALID });
    expect(sessionWrite({ ...draft, durationMin: -10 }, 0)).toMatchObject({ error: DURATION_INVALID });
    expect(sessionWrite({ ...draft, capacity: 0 }, 0)).toMatchObject({ error: CAPACITY_INVALID });
    expect(sessionWrite({ ...draft, capacity: 1.2 }, 0)).toMatchObject({ error: CAPACITY_INVALID });
    expect(sessionWrite({ ...draft, date: '2026-03-29', startTime: '03:30' }, 0)).toEqual({
      ok: false,
      error: KYIV_TIME_GAP_MESSAGE,
    });
  });

  it('refuses a capacity below the active booking count and allows the same count', () => {
    expect(capacityError(7, 8)).toBe('Місткість не може бути меншою за кількість активних записів (8).');
    expect(sessionWrite({ ...draft, capacity: 2 }, 3)).toMatchObject({
      error: 'Місткість не може бути меншою за кількість активних записів (3).',
    });
    expect(sessionWrite({ ...draft, capacity: 3 }, 3).ok).toBe(true);
    expect(capacityError(8, 8)).toBeNull();
  });

  it('asks before changing the time or instructor of a session that already has bookings', () => {
    const current = {
      instructorId: 'teacher-a',
      startsAt: '2026-10-26T16:00:00.000Z',
      endsAt: '2026-10-26T16:55:00.000Z',
    };
    const moved = sessionWrite({ ...draft, startTime: '19:00' }, 4);
    const teacher = sessionWrite({ ...draft, instructorId: 'teacher-b' }, 4);
    const capacityOnly = sessionWrite({ ...draft, capacity: 14 }, 4);
    expect(moved.ok && teacher.ok && capacityOnly.ok).toBe(true);
    if (!moved.ok || !teacher.ok || !capacityOnly.ok) return;

    expect(
      sessionChangeNeedsConfirmation(4, current, {
        instructorId: moved.value.instructor_id,
        startsAt: moved.value.starts_at,
        endsAt: moved.value.ends_at,
      }),
    ).toBe(true);
    expect(
      sessionChangeNeedsConfirmation(4, current, {
        instructorId: teacher.value.instructor_id,
        startsAt: teacher.value.starts_at,
        endsAt: teacher.value.ends_at,
      }),
    ).toBe(true);
    expect(
      sessionChangeNeedsConfirmation(4, current, {
        instructorId: capacityOnly.value.instructor_id,
        startsAt: capacityOnly.value.starts_at,
        endsAt: capacityOnly.value.ends_at,
      }),
    ).toBe(false);
    expect(sessionChangeNeedsConfirmation(0, current, {
      instructorId: 'teacher-b',
      startsAt: current.startsAt,
      endsAt: current.endsAt,
    })).toBe(false);
    expect(sessionReschedulePrompt(4)).toContain('4');
    expect(sessionChangeNeedsConfirmation(4, current, {
      instructorId: current.instructorId,
      startsAt: '2026-10-26T16:00:00+00:00',
      endsAt: current.endsAt,
    })).toBe(false);
  });

  it('reads an existing session back into the Kyiv form', () => {
    expect(
      sessionDraftFromCard({
        type_id: 'pole',
        instructor_id: 'teacher-a',
        starts_at: '2026-10-23T15:00:00.000Z',
        ends_at: '2026-10-23T16:00:00.000Z',
        capacity: 12,
      }),
    ).toEqual({
      typeId: 'pole',
      instructorId: 'teacher-a',
      date: '2026-10-23',
      startTime: '18:00',
      durationMin: 60,
      capacity: 12,
    });
  });

  it('cancels by status and leaves bookings and pass credits untouched', () => {
    const bookings = [{ id: 'booking-1', status: 'booked' as const, pass_id: 'pass-1' }];
    const pass = { id: 'pass-1', remaining: 7 };
    const result = applySessionCancel(
      { id: 'session-1', status: 'scheduled' as const },
      bookings,
      pass,
    );

    expect(sessionCancelPatch()).toEqual({ status: 'cancelled' });
    expect(Object.keys(sessionCancelPatch())).toEqual(['status']);
    expect(result.session).toEqual({ id: 'session-1', status: 'cancelled' });
    expect(result.bookings).toBe(bookings);
    expect(result.bookings[0]?.status).toBe('booked');
    expect(result.pass).toBe(pass);
    expect(result.pass.remaining).toBe(7);
    expect(sessionCancelPrompt(2)).toContain('Активних записів: 2');
    expect(sessionCancelPrompt(2)).toContain('Кредити абонементів не зміняться');
  });

  it('lists sessions in chronological order for a Kyiv date range', () => {
    const range = sessionListRange('2026-10-26', '2026-10-27');
    expect(range).toEqual({
      ok: true,
      value: { from: '2026-10-25T22:00:00.000Z', to: '2026-10-27T22:00:00.000Z' },
    });
    expect(sessionListRange('2026-10-27', '2026-10-26').ok).toBe(false);

    expect(
      sortSessionsByStart([
        { id: 'later', starts_at: '2026-10-26T17:00:00.000Z' },
        { id: 'earlier', starts_at: '2026-10-26T16:00:00+00:00' },
      ]).map((row) => row.id),
    ).toEqual(['earlier', 'later']);
  });

  it('labels instructor choices by profile name and does not use a role', () => {
    expect(
      instructorChoices([
        { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', name: 'Олена' },
        { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', name: '  Олена  ' },
        { id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', name: null },
      ]),
    ).toEqual([
      { id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', label: 'Без імені' },
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', label: 'Олена · aaaaaaaa' },
      { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', label: 'Олена · bbbbbbbb' },
    ]);
  });
});

describe('session write errors', () => {
  it('maps a non-admin database refusal to Ukrainian', () => {
    expect(sessionWriteErrorMessage({ code: '42501', message: 'permission denied' }, 'Збій')).toBe(
      ADMIN_WRITE_DENIED,
    );
    expect(
      sessionWriteErrorMessage({ code: 'PGRST301', message: 'new row violates row-level security' }, 'Збій'),
    ).toBe(ADMIN_WRITE_DENIED);
    expect(sessionWriteErrorMessage(new Error('Місткість має бути додатним цілим числом.'), 'Збій')).toBe(
      CAPACITY_INVALID,
    );
    expect(sessionWriteErrorMessage({ message: 'connection reset' }, 'Збій')).toBe('Збій');
  });
});
