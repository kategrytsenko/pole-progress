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
  ScheduleApi,
  SettingsApi,
} from '@org/data';
import {
  addWeeks,
  formatKyivDate,
  formatKyivDay,
  formatKyivTime,
  formatWeekSpan,
  kyivDateKey,
  startOfWeek,
  weekDays,
  weekRangeIso,
} from './week';

export interface PassBalanceView {
  readonly id: string;
  readonly name: string;
  readonly remaining: number;
  readonly validUntilLabel: string;
  readonly nextToUse: boolean;
}

export interface ScheduleSessionView {
  readonly id: string;
  readonly typeName: string;
  readonly instructorName: string;
  readonly timeLabel: string;
  readonly capacityLabel: string;
  readonly cancelled: boolean;
  readonly booked: boolean;
  readonly canBook: boolean;
  readonly hint: string | null;
  readonly full: boolean;
}

export interface ScheduleDayView {
  readonly key: string;
  readonly label: string;
  readonly isToday: boolean;
  readonly sessions: readonly ScheduleSessionView[];
}

interface ScheduleState {
  weekStart: Date;
  typeId: string | null;
  types: ClassType[];
  sessions: ClassSessionCard[];
  bookings: Booking[];
  passes: ClientPass[];
  products: PassProduct[];
  cutoffHours: number;
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

function sessionHint(
  session: ClassSessionCard,
  booked: boolean,
  hasPass: boolean,
  now: number,
): string | null {
  if (session.status === 'cancelled') return 'Заняття скасовано';
  const upcoming = Date.parse(session.starts_at) > now;
  if (!upcoming && !booked) return 'Заняття вже відбулося';
  if (!booked && session.booked_count >= session.capacity) return 'Немає місць';
  if (!booked && upcoming && !hasPass) return 'Немає активного абонемента';
  return null;
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
    types: [],
    sessions: [],
    bookings: [],
    passes: [],
    products: [],
    cutoffHours: 12,
    loading: true,
    error: null,
    pendingSessionId: null,
  });

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly cutoffHours = computed(() => this.state().cutoffHours);
  readonly typeId = computed(() => this.state().typeId);
  readonly pendingSessionId = computed(() => this.state().pendingSessionId);
  readonly weekLabel = computed(() => formatWeekSpan(this.state().weekStart));
  readonly types = computed(() => this.state().types.filter((type) => type.active));

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

  readonly days = computed<ScheduleDayView[]>(() => {
    const { weekStart, sessions, bookings, passes } = this.state();
    const now = Date.now();
    const todayKey = kyivDateKey(new Date(now));
    const hasPass = passes.length > 0;
    const bookedBySession = new Map(
      bookings.filter((row) => row.status === 'booked').map((row) => [row.session_id, row]),
    );
    const byDay = new Map<string, ClassSessionCard[]>();
    for (const session of sessions) {
      const key = kyivDateKey(new Date(session.starts_at));
      const list = byDay.get(key);
      if (list) list.push(session);
      else byDay.set(key, [session]);
    }

    return weekDays(weekStart).map((day) => {
      const key = kyivDateKey(day);
      const rows = byDay.get(key) ?? [];
      return {
        key,
        label: formatKyivDay(day),
        isToday: key === todayKey,
        sessions: rows.map((session) => {
          const booked = bookedBySession.has(session.id);
          const upcoming = Date.parse(session.starts_at) > now;
          const full = session.booked_count >= session.capacity;
          const open = session.status === 'scheduled';
          return {
            id: session.id,
            typeName: session.type_name,
            instructorName: session.instructor_name?.trim() || 'Інструктор',
            timeLabel: `${formatKyivTime(session.starts_at)}–${formatKyivTime(session.ends_at)}`,
            capacityLabel: `${session.booked_count} / ${session.capacity}`,
            cancelled: session.status === 'cancelled',
            booked,
            canBook: open && upcoming && !full && hasPass && !booked,
            hint: sessionHint(session, booked, hasPass, now),
            full,
          };
        }),
      };
    });
  });

  async load(): Promise<void> {
    const id = ++this.generation;
    const weekStart = this.state().weekStart;
    const typeId = this.state().typeId;
    this.state.update((current) => ({ ...current, loading: true, error: null }));

    try {
      const [types, products, settings, fetched] = await Promise.all([
        this.schedule.listClassTypes(),
        this.passesApi.listProducts(),
        this.settings.getAppSettings(),
        this.fetchRange(weekStart, typeId),
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

  async setType(typeId: string | null): Promise<void> {
    if (this.state().typeId === typeId) return;
    this.state.update((current) => ({ ...current, typeId }));
    await this.load();
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
    const typeId = this.state().typeId;
    this.state.update((current) => ({ ...current, pendingSessionId: sessionId }));
    try {
      const value = await action();
      const fetched = await this.fetchRange(weekStart, typeId);
      this.state.update((current) => {
        const sameView =
          current.weekStart.getTime() === weekStart.getTime() && current.typeId === typeId;
        if (!sameView) return { ...current, pendingSessionId: null };
        return { ...current, ...fetched, pendingSessionId: null, error: null };
      });
      return value;
    } catch (err) {
      this.state.update((current) => ({ ...current, pendingSessionId: null }));
      throw err;
    }
  }

  private async fetchRange(weekStart: Date, typeId: string | null): Promise<FetchedRange> {
    const [sessions, bookings, passes] = await Promise.all([
      this.schedule.listSessionsInRange(weekRangeIso(weekStart), typeId),
      this.bookingsApi.listMine(),
      this.passesApi.listMine(),
    ]);
    return { sessions, bookings, passes };
  }
}
