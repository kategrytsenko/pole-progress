import { sessionBookingState } from './booking-access';
import {
  formatKyivDay,
  formatKyivTime,
  kyivDateKey,
  kyivTimeKey,
  weekDays,
} from './week';

export type SessionAvailability = 'available' | 'full' | 'cancelled';

export const AVAILABILITY_LABEL: Readonly<Record<SessionAvailability, string>> = {
  available: 'Є місця',
  full: 'Немає місць',
  cancelled: 'Скасовано',
};

export const SCHEDULE_DAY_EMPTY = 'Немає занять';
export const SCHEDULE_FILTER_EMPTY = 'Немає занять за цими фільтрами.';
export const SCHEDULE_SEAT_NOTE =
  'Вільні місця не відкривають запис. Для запису потрібні заповнений профіль і абонемент.';

export interface ScheduleFilters {
  readonly typeId: string | null;
  readonly instructorId: string | null;
  readonly startTime: string | null;
}

export interface ScheduleSessionSource {
  readonly id: string;
  readonly typeId: string;
  readonly typeName: string;
  readonly instructorId: string;
  readonly instructorName: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly capacity: number;
  /** Active reservations from `list_sessions_in_range`: bookings with status `booked` only. */
  readonly bookedCount: number;
  readonly status: 'scheduled' | 'cancelled';
}

export interface InstructorOption {
  readonly id: string;
  readonly name: string;
}

export interface ScheduleSessionView {
  readonly id: string;
  readonly typeName: string;
  readonly instructorName: string;
  readonly dateLabel: string;
  readonly startLabel: string;
  readonly timeLabel: string;
  readonly capacity: number;
  readonly bookedCount: number;
  readonly remainingSeats: number;
  readonly availability: SessionAvailability;
  readonly availabilityLabel: string;
  readonly cancelled: boolean;
  readonly booked: boolean;
  readonly canBook: boolean;
  readonly canCancel: boolean;
  readonly hint: string | null;
  readonly full: boolean;
}

export interface ScheduleDayView {
  readonly key: string;
  readonly label: string;
  readonly isToday: boolean;
  readonly sessions: readonly ScheduleSessionView[];
}

export interface ScheduleDayContext {
  readonly weekStart: Date;
  readonly sessions: readonly ScheduleSessionSource[];
  readonly filters: ScheduleFilters;
  readonly bookedSessionIds: ReadonlySet<string>;
  readonly hasPass: boolean;
  readonly profileComplete: boolean;
  readonly now: number;
}

/**
 * Seats left from the authoritative active-booking count.
 * A count above capacity still shows zero remaining.
 */
export function remainingSeats(capacity: number, activeBookings: number): number {
  return Math.max(0, capacity - activeBookings);
}

/**
 * Same rule as `list_sessions_in_range`: a cancelled booking is not an active reservation.
 */
export function activeBookingCount(statuses: readonly ('booked' | 'cancelled')[]): number {
  return statuses.reduce((count, status) => (status === 'booked' ? count + 1 : count), 0);
}

export function sessionAvailability(
  status: 'scheduled' | 'cancelled',
  activeBookings: number,
  capacity: number,
): SessionAvailability {
  if (status === 'cancelled') return 'cancelled';
  if (remainingSeats(capacity, activeBookings) === 0) return 'full';
  return 'available';
}

export function scheduleFiltersActive(filters: ScheduleFilters): boolean {
  return filters.typeId !== null || filters.instructorId !== null || filters.startTime !== null;
}

export function filterSessions<T extends ScheduleSessionSource>(
  sessions: readonly T[],
  filters: ScheduleFilters,
): T[] {
  return sessions.filter((session) => {
    if (filters.typeId !== null && session.typeId !== filters.typeId) return false;
    if (filters.instructorId !== null && session.instructorId !== filters.instructorId) return false;
    if (filters.startTime !== null && kyivTimeKey(session.startsAt) !== filters.startTime) return false;
    return true;
  });
}

export function scheduleInstructors(sessions: readonly ScheduleSessionSource[]): InstructorOption[] {
  const byId = new Map<string, string>();
  for (const session of sessions) {
    if (!byId.has(session.instructorId)) {
      byId.set(session.instructorId, instructorLabel(session.instructorName));
    }
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk') || a.id.localeCompare(b.id));
}

export function instructorFilterOptions(
  sessions: readonly ScheduleSessionSource[],
  selected: InstructorOption | null,
): InstructorOption[] {
  const options = scheduleInstructors(sessions);
  if (!selected || options.some((option) => option.id === selected.id)) return options;
  return [...options, selected].sort(
    (a, b) => a.name.localeCompare(b.name, 'uk') || a.id.localeCompare(b.id),
  );
}

export function scheduleStartTimes(sessions: readonly ScheduleSessionSource[]): string[] {
  return [...new Set(sessions.map((session) => kyivTimeKey(session.startsAt)))].sort();
}

export function startTimeFilterOptions(
  sessions: readonly ScheduleSessionSource[],
  selected: string | null,
): string[] {
  const times = scheduleStartTimes(sessions);
  if (!selected || times.includes(selected)) return times;
  return [...times, selected].sort();
}

export function buildScheduleDays(input: ScheduleDayContext): ScheduleDayView[] {
  const filtered = filterSessions(input.sessions, input.filters);
  const todayKey = kyivDateKey(new Date(input.now));
  const byDay = new Map<string, ScheduleSessionSource[]>();
  for (const session of filtered) {
    const key = kyivDateKey(new Date(session.startsAt));
    const list = byDay.get(key);
    if (list) list.push(session);
    else byDay.set(key, [session]);
  }

  return weekDays(input.weekStart).map((day) => {
    const key = kyivDateKey(day);
    const rows = byDay.get(key) ?? [];
    return {
      key,
      label: formatKyivDay(day),
      isToday: key === todayKey,
      sessions: rows.map((session) => presentSession(session, input)),
    };
  });
}

/** Days stay visible while browsing a week. An active filter hides dates with no match. */
export function visibleScheduleDays(
  days: readonly ScheduleDayView[],
  filtersActive: boolean,
): ScheduleDayView[] {
  if (!filtersActive) return [...days];
  return days.filter((day) => day.sessions.length > 0);
}

function presentSession(session: ScheduleSessionSource, input: ScheduleDayContext): ScheduleSessionView {
  const booked = input.bookedSessionIds.has(session.id);
  const booking = sessionBookingState({
    status: session.status,
    startsAt: session.startsAt,
    bookedCount: session.bookedCount,
    capacity: session.capacity,
    booked,
    hasPass: input.hasPass,
    profileComplete: input.profileComplete,
    now: input.now,
  });
  const availability = sessionAvailability(session.status, session.bookedCount, session.capacity);
  const startLabel = formatKyivTime(session.startsAt);
  return {
    id: session.id,
    typeName: session.typeName,
    instructorName: instructorLabel(session.instructorName),
    dateLabel: formatKyivDay(new Date(session.startsAt)),
    startLabel,
    timeLabel: `${startLabel}–${formatKyivTime(session.endsAt)}`,
    capacity: session.capacity,
    bookedCount: session.bookedCount,
    remainingSeats: remainingSeats(session.capacity, session.bookedCount),
    availability,
    availabilityLabel: AVAILABILITY_LABEL[availability],
    cancelled: availability === 'cancelled',
    booked,
    canBook: booking.canBook,
    canCancel: booking.canCancel,
    hint: booking.hint,
    full: availability === 'full',
  };
}

function instructorLabel(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : 'Інструктор';
}
