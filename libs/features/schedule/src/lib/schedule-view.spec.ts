import { kyivDateKey, startOfWeek } from './week';
import {
  activeBookingCount,
  buildScheduleDays,
  filterSessions,
  instructorFilterOptions,
  remainingSeats,
  SCHEDULE_DAY_EMPTY,
  SCHEDULE_FILTER_EMPTY,
  scheduleFiltersActive,
  sessionAvailability,
  startTimeFilterOptions,
  visibleScheduleDays,
  type ScheduleDayContext,
  type ScheduleFilters,
  type ScheduleSessionSource,
} from './schedule-view';

const weekStart = startOfWeek(new Date('2026-10-08T12:00:00.000Z'));
const now = Date.parse('2026-10-05T06:00:00.000Z');

const openFilters: ScheduleFilters = {
  typeId: null,
  instructorId: null,
  startTime: null,
};

function session(overrides: Partial<ScheduleSessionSource> = {}): ScheduleSessionSource {
  return {
    id: 'session-1',
    typeId: 'pole',
    typeName: 'Базовий pole',
    instructorId: 'teacher-a',
    instructorName: 'Олена',
    startsAt: '2026-10-05T15:00:00.000Z',
    endsAt: '2026-10-05T16:00:00.000Z',
    capacity: 8,
    bookedCount: 2,
    status: 'scheduled',
    ...overrides,
  };
}

function context(overrides: Partial<ScheduleDayContext> = {}): ScheduleDayContext {
  return {
    weekStart,
    sessions: [],
    filters: openFilters,
    bookedSessionIds: new Set<string>(),
    hasPass: true,
    profileComplete: true,
    now,
    ...overrides,
  };
}

describe('schedule seat count', () => {
  it('ignores cancelled bookings when counting remaining seats', () => {
    const statuses = ['booked', 'cancelled', 'booked', 'cancelled'] as const;
    expect(activeBookingCount(statuses)).toBe(2);
    expect(remainingSeats(8, activeBookingCount(statuses))).toBe(6);
  });

  it('shows zero remaining when active bookings reach or pass capacity', () => {
    expect(remainingSeats(8, 8)).toBe(0);
    expect(remainingSeats(8, 9)).toBe(0);
    expect(sessionAvailability('scheduled', 8, 8)).toBe('full');
    expect(sessionAvailability('scheduled', 9, 8)).toBe('full');
  });
});

describe('schedule filters', () => {
  const sessions = [
    session({ id: 'mon-pole', instructorId: 'teacher-a', instructorName: 'Олена' }),
    session({
      id: 'tue-exotic',
      typeId: 'exotic',
      typeName: 'Exotic',
      instructorId: 'teacher-b',
      instructorName: 'Марко',
      startsAt: '2026-10-06T08:00:00.000Z',
      endsAt: '2026-10-06T09:00:00.000Z',
    }),
    session({
      id: 'mon-late',
      instructorId: 'teacher-a',
      startsAt: '2026-10-05T16:00:00.000Z',
      endsAt: '2026-10-05T17:00:00.000Z',
    }),
  ];

  it('combines class type, instructor, and Kyiv start time', () => {
    const matched = filterSessions(sessions, {
      typeId: 'pole',
      instructorId: 'teacher-a',
      startTime: '18:00',
    });

    expect(matched.map((row) => row.id)).toEqual(['mon-pole']);
    expect(filterSessions(sessions, { ...openFilters, startTime: '15:00' })).toEqual([]);
  });

  it('keeps a selected instructor and time when that week has no matching session', () => {
    expect(instructorFilterOptions([], { id: 'teacher-a', name: 'Олена' })).toEqual([
      { id: 'teacher-a', name: 'Олена' },
    ]);
    expect(startTimeFilterOptions([], '18:00')).toEqual(['18:00']);
  });

  it('returns an empty week and a filter empty state', () => {
    const days = buildScheduleDays(context({ sessions: [] }));
    expect(days).toHaveLength(7);
    expect(days.every((day) => day.sessions.length === 0)).toBe(true);
    expect(visibleScheduleDays(days, false)).toHaveLength(7);
    expect(SCHEDULE_DAY_EMPTY).toBe('Немає занять');

    const filtered = buildScheduleDays(
      context({
        sessions,
        filters: { ...openFilters, instructorId: 'missing' },
      }),
    );
    expect(scheduleFiltersActive({ ...openFilters, instructorId: 'missing' })).toBe(true);
    expect(visibleScheduleDays(filtered, true)).toEqual([]);
    expect(SCHEDULE_FILTER_EMPTY).toBe('Немає занять за цими фільтрами.');
  });

  it('drops empty dates only while a filter is active', () => {
    const days = buildScheduleDays(
      context({
        sessions,
        filters: { ...openFilters, startTime: '11:00' },
      }),
    );
    const visible = visibleScheduleDays(days, true);

    expect(visible.map((day) => day.key)).toEqual(['2026-10-06']);
    expect(visible[0]?.sessions.map((row) => row.id)).toEqual(['tue-exotic']);
  });
});

describe('schedule session status', () => {
  it('keeps a full class distinct from a cancelled class and blocks booking', () => {
    const days = buildScheduleDays(
      context({
        sessions: [
          session({ id: 'full', bookedCount: 8, capacity: 8 }),
          session({
            id: 'cancelled',
            status: 'cancelled',
            bookedCount: 1,
            startsAt: '2026-10-06T15:00:00.000Z',
            endsAt: '2026-10-06T16:00:00.000Z',
          }),
        ],
      }),
    );
    const full = days.find((day) => day.key === '2026-10-05')?.sessions[0];
    const cancelled = days.find((day) => day.key === '2026-10-06')?.sessions[0];

    expect(full).toMatchObject({
      availability: 'full',
      availabilityLabel: 'Немає місць',
      capacity: 8,
      bookedCount: 8,
      remainingSeats: 0,
      canBook: false,
      hint: 'Немає місць',
    });
    expect(cancelled).toMatchObject({
      availability: 'cancelled',
      availabilityLabel: 'Скасовано',
      remainingSeats: 7,
      canBook: false,
      hint: 'Заняття скасовано',
    });
    expect(full?.availability).not.toBe(cancelled?.availability);
  });

  it('shows an open class to a client who cannot book', () => {
    const [monday] = buildScheduleDays(
      context({
        sessions: [session()],
        hasPass: false,
        profileComplete: false,
      }),
    );
    const card = monday?.sessions[0];

    expect(card).toMatchObject({
      availability: 'available',
      availabilityLabel: 'Є місця',
      dateLabel: monday?.label,
      startLabel: '18:00',
      typeName: 'Базовий pole',
      instructorName: 'Олена',
      capacity: 8,
      bookedCount: 2,
      remainingSeats: 6,
      canBook: false,
    });
    expect(card?.hint).toBe('Немає активного абонемента');
    expect(kyivDateKey(new Date('2026-10-05T15:00:00.000Z'))).toBe(monday?.key);
  });
});
