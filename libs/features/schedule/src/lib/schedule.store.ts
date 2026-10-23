import { computed, inject, Injectable, signal } from '@angular/core';
import {
  BookingsApi,
  type Booking,
  type CancelBookingResult,
  type ClassSessionCard,
  type ClassType,
  type ClientPass,
  PassesApi,
  type PassProduct,
  classTypesForClientFilter,
  ScheduleApi,
  SettingsApi,
} from '@org/data';
import {
  buildScheduleDays,
  instructorFilterOptions,
  scheduleFiltersActive,
  startTimeFilterOptions,
  visibleScheduleDays,
  type ScheduleDayView,
  type ScheduleFilters,
  type ScheduleSessionSource,
} from './schedule-view';
import { addWeeks, formatKyivDate, formatWeekSpan, startOfWeek, weekRangeIso } from './week';

export interface PassBalanceView {
  readonly id: string;
  readonly name: string;
  readonly remaining: number;
  readonly validUntilLabel: string;
  readonly nextToUse: boolean;
}

interface ScheduleState {
  weekStart: Date;
  typeId: string | null;
  instructorId: string | null;
  instructorLabel: string | null;
  startTime: string | null;
  types: ClassType[];
  sessions: ClassSessionCard[];
  bookings: Booking[];
  passes: ClientPass[];
  products: PassProduct[];
  cutoffHours: number;
  profileComplete: boolean;
  loading: boolean;
  error: string | null;
  pendingSessionId: string | null;
}

interface FetchedRange {
  sessions: ClassSessionCard[];
  bookings: Booking[];
  passes: ClientPass[];
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

@Injectable()
export class ScheduleStore {
  private readonly schedule = inject(ScheduleApi);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly passesApi = inject(PassesApi);
  private readonly settings = inject(SettingsApi);

  private generation = 0;

  private readonly state = signal<ScheduleState>({
    weekStart: startOfWeek(new Date()),
    typeId: null,
    instructorId: null,
    instructorLabel: null,
    startTime: null,
    types: [],
    sessions: [],
    bookings: [],
    passes: [],
    products: [],
    cutoffHours: 12,
    profileComplete: false,
    loading: true,
    error: null,
    pendingSessionId: null,
  });

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly cutoffHours = computed(() => this.state().cutoffHours);
  readonly typeId = computed(() => this.state().typeId);
  readonly instructorId = computed(() => this.state().instructorId);
  readonly startTime = computed(() => this.state().startTime);
  readonly pendingSessionId = computed(() => this.state().pendingSessionId);
  readonly weekLabel = computed(() => formatWeekSpan(this.state().weekStart));
  readonly types = computed(() => classTypesForClientFilter(this.state().types));

  readonly passBalances = computed<PassBalanceView[]>(() => {
    const names = new Map(this.state().products.map((product) => [product.id, product.name]));
    return this.state().passes.map((pass, index) => ({
      id: pass.id,
      name: names.get(pass.product_id) ?? 'Абонемент',
      remaining: pass.remaining,
      validUntilLabel: formatKyivDate(pass.valid_until),
      nextToUse: index === 0,
    }));
  });

  readonly remainingClasses = computed(() =>
    this.state().passes.reduce((sum, pass) => sum + pass.remaining, 0),
  );

  setProfileComplete(profileComplete: boolean): void {
    this.state.update((current) =>
      current.profileComplete === profileComplete ? current : { ...current, profileComplete },
    );
  }

  private readonly sources = computed(() => this.state().sessions.map(toSource));

  readonly filters = computed<ScheduleFilters>(() => {
    const { typeId, instructorId, startTime } = this.state();
    return { typeId, instructorId, startTime };
  });

  readonly filtersActive = computed(() => scheduleFiltersActive(this.filters()));

  readonly instructors = computed(() => {
    const { instructorId, instructorLabel } = this.state();
    const selected =
      instructorId && instructorLabel ? { id: instructorId, name: instructorLabel } : null;
    return instructorFilterOptions(this.sources(), selected);
  });

  readonly startTimes = computed(() => startTimeFilterOptions(this.sources(), this.state().startTime));

  readonly days = computed<ScheduleDayView[]>(() => {
    const { weekStart, bookings, passes, profileComplete } = this.state();
    const bookedSessionIds = new Set(
      bookings.filter((row) => row.status === 'booked').map((row) => row.session_id),
    );
    return buildScheduleDays({
      weekStart,
      sessions: this.sources(),
      filters: this.filters(),
      bookedSessionIds,
      hasPass: passes.length > 0,
      profileComplete,
      now: Date.now(),
    });
  });

  readonly visibleDays = computed(() => visibleScheduleDays(this.days(), this.filtersActive()));

  async load(): Promise<void> {
    const id = ++this.generation;
    const weekStart = this.state().weekStart;
    this.state.update((current) => ({ ...current, loading: true, error: null }));

    try {
      const [types, products, settings, fetched] = await Promise.all([
        this.schedule.listClassTypes(),
        this.passesApi.listProducts(),
        this.settings.getAppSettings(),
        this.fetchRange(weekStart),
      ]);
      if (id !== this.generation) return;
      this.state.update((current) => ({
        ...current,
        ...fetched,
        types,
        products,
        cutoffHours: settings?.cancel_cutoff_hours ?? current.cutoffHours,
        loading: false,
        error: null,
      }));
    } catch (err) {
      if (id !== this.generation) return;
      this.state.update((current) => ({
        ...current,
        loading: false,
        error: toErrorMessage(err, 'Не вдалося завантажити розклад.'),
      }));
    }
  }

  async shiftWeek(delta: number): Promise<void> {
    this.state.update((current) => ({
      ...current,
      weekStart: addWeeks(current.weekStart, delta),
    }));
    await this.load();
  }

  async goToCurrentWeek(): Promise<void> {
    this.state.update((current) => ({ ...current, weekStart: startOfWeek(new Date()) }));
    await this.load();
  }

  setType(typeId: string | null): void {
    this.state.update((current) => (current.typeId === typeId ? current : { ...current, typeId }));
  }

  setInstructor(instructorId: string | null): void {
    this.state.update((current) => {
      if (current.instructorId === instructorId) return current;
      const selected =
        current.instructorId && current.instructorLabel
          ? { id: current.instructorId, name: current.instructorLabel }
          : null;
      const known = instructorFilterOptions(this.sources(), selected);
      const instructorLabel = instructorId
        ? (known.find((option) => option.id === instructorId)?.name ?? 'Інструктор')
        : null;
      return { ...current, instructorId, instructorLabel };
    });
  }

  setStartTime(startTime: string | null): void {
    this.state.update((current) =>
      current.startTime === startTime ? current : { ...current, startTime },
    );
  }

  clearFilters(): void {
    this.state.update((current) => {
      if (!scheduleFiltersActive(current)) return current;
      return { ...current, typeId: null, instructorId: null, instructorLabel: null, startTime: null };
    });
  }

  async book(sessionId: string): Promise<boolean> {
    const booking = await this.mutate(sessionId, () => this.bookingsApi.bookSession(sessionId));
    return booking !== undefined;
  }

  async cancel(sessionId: string): Promise<CancelBookingResult | null> {
    const booking = this.state().bookings.find(
      (row) => row.session_id === sessionId && row.status === 'booked',
    );
    if (!booking) throw new Error('booking_not_found');
    const result = await this.mutate(sessionId, () => this.bookingsApi.cancelBooking(booking.id));
    return result ?? null;
  }

  private async mutate<T>(sessionId: string, action: () => Promise<T>): Promise<T | undefined> {
    if (this.state().pendingSessionId) return undefined;
    const weekStart = this.state().weekStart;
    this.state.update((current) => ({ ...current, pendingSessionId: sessionId }));
    try {
      const value = await action();
      const fetched = await this.fetchRange(weekStart);
      this.state.update((current) => {
        const sameWeek = current.weekStart.getTime() === weekStart.getTime();
        if (!sameWeek) return { ...current, pendingSessionId: null };
        return { ...current, ...fetched, pendingSessionId: null, error: null };
      });
      return value;
    } catch (err) {
      this.state.update((current) => ({ ...current, pendingSessionId: null }));
      throw err;
    }
  }

  private async fetchRange(weekStart: Date): Promise<FetchedRange> {
    const [sessions, bookings, passes] = await Promise.all([
      this.schedule.listSessionsInRange(weekRangeIso(weekStart)),
      this.bookingsApi.listMine(),
      this.passesApi.listMine(),
    ]);
    return { sessions, bookings, passes };
  }
}

function toSource(session: ClassSessionCard): ScheduleSessionSource {
  return {
    id: session.id,
    typeId: session.type_id,
    typeName: session.type_name,
    instructorId: session.instructor_id,
    instructorName: session.instructor_name,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    capacity: session.capacity,
    bookedCount: session.booked_count,
    status: session.status,
  };
}
