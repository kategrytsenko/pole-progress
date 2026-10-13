import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  PROFILE_NAME_PHONE_REQUIREMENT,
  profileCompletionPath,
  AuthStore,
} from '@org/auth';
import { StateBlockComponent, ToastService } from '@org/shell';
import { ScheduleStore } from '../schedule.store';
import {
  SCHEDULE_DAY_EMPTY,
  SCHEDULE_FILTER_EMPTY,
  SCHEDULE_SEAT_NOTE,
  type SessionAvailability,
} from '../schedule-view';

const BOOKING_ERRORS: readonly { code: string; message: string }[] = [
  { code: 'class_full', message: 'На це заняття вже немає місць.' },
  { code: 'no_pass', message: 'Немає активного абонемента з заняттями.' },
  { code: 'already_booked', message: 'Ви вже записані на це заняття.' },
  { code: 'session_unavailable', message: 'Це заняття вже недоступне для запису.' },
  { code: 'booking_not_found', message: 'Запис не знайдено.' },
  { code: 'not_allowed', message: 'Немає прав скасувати цей запис.' },
  { code: 'not_authenticated', message: 'Увійдіть, щоб змінити запис.' },
  { code: 'profile_incomplete', message: PROFILE_NAME_PHONE_REQUIREMENT },
];

function selectValue(event: Event): string | null {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return null;
  return target.value.length > 0 ? target.value : null;
}

function bookingErrorMessage(err: unknown): string {
  const text = errorText(err);
  const known = BOOKING_ERRORS.find((item) => text.includes(item.code));
  return known?.message ?? 'Не вдалося оновити запис. Спробуйте ще раз.';
}

function errorText(err: unknown): string {
  if (typeof err === 'string') return err;
  if (typeof err !== 'object' || err === null) return '';
  const record = err as { message?: unknown; details?: unknown };
  return [record.message, record.details].filter((part) => typeof part === 'string').join(' ');
}

@Component({
  selector: 'pp-schedule',
  imports: [RouterLink, StateBlockComponent],
  providers: [ScheduleStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Розклад</h1>
          <p class="mt-1 text-sm text-neutral-600">{{ seatNote }}</p>
          <p class="mt-1 text-sm text-neutral-600">
            Скасування раніше ніж за {{ store.cutoffHours() }} год до початку повертає заняття на абонемент.
          </p>
        </div>
      </header>

      @if (!auth.profileComplete()) {
        <p class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          {{ profileRequirement }}
          Запис і скасування відкриються після збереження.
          <a
            routerLink="/app/profile"
            [queryParams]="{ notice: 'incomplete', redirect: '/app/schedule' }"
            class="font-medium underline underline-offset-2"
          >Заповнити профіль</a>
        </p>
      }

      @if (!store.loading() && !store.error()) {
        <section aria-label="Абонементи" class="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-semibold text-neutral-800">Абонемент</h2>
          @if (store.passBalances().length === 0) {
            <p class="mt-1 text-sm text-neutral-600">
              Немає активного абонемента. Запис на заняття недоступний.
            </p>
          } @else {
            <ul class="mt-2 space-y-2">
              @for (pass of store.passBalances(); track pass.id) {
                <li class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-700">
                  <span class="font-medium text-neutral-900">{{ pass.name }}</span>
                  <span>залишилось {{ pass.remaining }}</span>
                  <span>до {{ pass.validUntilLabel }}</span>
                  @if (pass.nextToUse) {
                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      списується наступним
                    </span>
                  }
                </li>
              }
            </ul>
            @if (store.passBalances().length > 1) {
              <p class="mt-2 text-xs text-neutral-500">Разом {{ store.remainingClasses() }} занять</p>
            }
          }
        </section>
      }

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="onShiftWeek(-1)"
            class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Попередній
          </button>
          <p class="min-w-40 text-center text-sm font-medium text-neutral-800">{{ store.weekLabel() }}</p>
          <button
            type="button"
            (click)="onShiftWeek(1)"
            class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Наступний
          </button>
        </div>
        <button
          type="button"
          (click)="onCurrentWeek()"
          class="rounded-md px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          Цей тиждень
        </button>
      </div>

      <div class="space-y-3">
        <div role="tablist" aria-label="Тип заняття" class="flex flex-wrap gap-2">
          <button
            role="tab"
            type="button"
            [attr.aria-selected]="store.typeId() === null"
            (click)="onTypeChange(null)"
            [class]="filterPillClass(store.typeId() === null)"
          >
            Усі
          </button>
          @for (type of store.types(); track type.id) {
            <button
              role="tab"
              type="button"
              [attr.aria-selected]="store.typeId() === type.id"
              (click)="onTypeChange(type.id)"
              [class]="filterPillClass(store.typeId() === type.id)"
            >
              {{ type.name }}
            </button>
          }
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-700">Інструктор</span>
            <select
              [value]="store.instructorId() ?? ''"
              (change)="onInstructorChange($event)"
              class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Усі</option>
              @for (instructor of store.instructors(); track instructor.id) {
                <option [value]="instructor.id">{{ instructor.name }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-700">Час початку</span>
            <select
              [value]="store.startTime() ?? ''"
              (change)="onStartTimeChange($event)"
              class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Усі</option>
              @for (time of store.startTimes(); track time) {
                <option [value]="time">{{ time }}</option>
              }
            </select>
          </label>
        </div>

        @if (store.filtersActive()) {
          <button
            type="button"
            (click)="onClearFilters()"
            class="rounded-md px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Скинути фільтри
          </button>
        }
      </div>

      @if (store.loading()) {
        <pp-state-block mode="loading" />
      } @else if (store.error(); as error) {
        <div class="space-y-3">
          <pp-state-block mode="error" [message]="error" />
          <button
            type="button"
            (click)="onRetry()"
            class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Спробувати ще раз
          </button>
        </div>
      } @else {
        @if (store.filtersActive() && store.visibleDays().length === 0) {
          <pp-state-block mode="empty" [message]="filterEmpty" />
        } @else {
        <ol class="space-y-4">
          @for (day of store.visibleDays(); track day.key) {
            <li
              class="rounded-xl border bg-white p-4 shadow-sm"
              [class.border-primary]="day.isToday"
              [class.border-neutral-200]="!day.isToday"
            >
              <h2 class="text-sm font-semibold text-neutral-900">
                {{ day.label }}
                @if (day.isToday) {
                  <span class="ml-2 text-xs font-medium text-primary">сьогодні</span>
                }
              </h2>

              @if (day.sessions.length === 0) {
                <p class="mt-2 text-sm text-neutral-500">{{ dayEmpty }}</p>
              } @else {
                <ul class="mt-3 grid gap-3 lg:grid-cols-2">
                  @for (session of day.sessions; track session.id) {
                    <li
                      class="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3"
                      [class.bg-neutral-50]="session.availability === 'cancelled'"
                      [class.opacity-70]="session.availability === 'cancelled'"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <p class="text-sm font-semibold text-neutral-900">{{ session.typeName }}</p>
                          <p class="mt-0.5 text-xs text-neutral-500">{{ session.instructorName }}</p>
                        </div>
                        <p [class]="availabilityClass(session.availability)">
                          {{ session.availabilityLabel }}
                        </p>
                      </div>

                      <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <dt class="text-neutral-500">Дата</dt>
                          <dd class="font-medium text-neutral-900">{{ session.dateLabel }}</dd>
                        </div>
                        <div>
                          <dt class="text-neutral-500">Початок</dt>
                          <dd class="font-medium text-neutral-900">{{ session.startLabel }}</dd>
                        </div>
                        <div>
                          <dt class="text-neutral-500">Час</dt>
                          <dd class="font-medium text-neutral-900">{{ session.timeLabel }}</dd>
                        </div>
                        <div>
                          <dt class="text-neutral-500">Місткість</dt>
                          <dd class="font-medium text-neutral-900">{{ session.capacity }}</dd>
                        </div>
                        <div>
                          <dt class="text-neutral-500">Активні записи</dt>
                          <dd class="font-medium text-neutral-900">{{ session.bookedCount }}</dd>
                        </div>
                        <div>
                          <dt class="text-neutral-500">Залишилось</dt>
                          <dd class="font-medium text-neutral-900">{{ session.remainingSeats }}</dd>
                        </div>
                      </dl>

                      <div class="flex flex-wrap items-center gap-2">
                        @if (session.booked) {
                          <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Ви записані
                          </span>
                          @if (session.canCancel) {
                            <button
                              type="button"
                              (click)="onCancel(session.id)"
                              [disabled]="store.pendingSessionId() !== null"
                              class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {{ store.pendingSessionId() === session.id ? 'Скасування…' : 'Скасувати запис' }}
                            </button>
                          }
                        } @else if (session.canBook) {
                          <button
                            type="button"
                            (click)="onBook(session.id)"
                            [disabled]="store.pendingSessionId() !== null"
                            class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {{ store.pendingSessionId() === session.id ? 'Запис…' : 'Записатися' }}
                          </button>
                        }

                        @if (session.hint) {
                          <p class="text-xs text-neutral-500">{{ session.hint }}</p>
                        }
                      </div>
                    </li>
                  }
                </ul>
              }
            </li>
          }
        </ol>
        }
      }
    </section>
  `,
})
export class SchedulePage implements OnInit {
  protected readonly store = inject(ScheduleStore);
  protected readonly auth = inject(AuthStore);
  protected readonly profileRequirement = PROFILE_NAME_PHONE_REQUIREMENT;
  protected readonly seatNote = SCHEDULE_SEAT_NOTE;
  protected readonly dayEmpty = SCHEDULE_DAY_EMPTY;
  protected readonly filterEmpty = SCHEDULE_FILTER_EMPTY;
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.setProfileComplete(this.auth.profileComplete());
    void this.store.load();
  }

  protected onShiftWeek(delta: number): void {
    void this.store.shiftWeek(delta);
  }

  protected onCurrentWeek(): void {
    void this.store.goToCurrentWeek();
  }

  protected onTypeChange(typeId: string | null): void {
    this.store.setType(typeId);
  }

  protected onInstructorChange(event: Event): void {
    this.store.setInstructor(selectValue(event));
  }

  protected onStartTimeChange(event: Event): void {
    this.store.setStartTime(selectValue(event));
  }

  protected onClearFilters(): void {
    this.store.clearFilters();
  }

  protected onRetry(): void {
    void this.store.load();
  }

  protected async onBook(sessionId: string): Promise<void> {
    if (!this.auth.profileComplete()) {
      await this.router.navigateByUrl(profileCompletionPath('/app/schedule'));
      return;
    }
    try {
      const booked = await this.store.book(sessionId);
      if (booked) this.toast.success('Вас записано на заняття.');
    } catch (err) {
      this.toast.error(bookingErrorMessage(err));
    }
  }

  protected async onCancel(sessionId: string): Promise<void> {
    if (!this.auth.profileComplete()) {
      await this.router.navigateByUrl(profileCompletionPath('/app/schedule'));
      return;
    }
    try {
      const result = await this.store.cancel(sessionId);
      if (!result) return;
      this.toast.success(
        result.creditRestored
          ? 'Запис скасовано. Заняття повернуто на абонемент.'
          : `Запис скасовано. Менше ніж за ${this.store.cutoffHours()} год до початку заняття не повертається.`,
      );
    } catch (err) {
      this.toast.error(bookingErrorMessage(err));
    }
  }

  protected availabilityClass(availability: SessionAvailability): string {
    const base = 'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium';
    if (availability === 'available') return `${base} bg-emerald-50 text-emerald-800`;
    if (availability === 'full') return `${base} bg-red-50 text-red-700`;
    return `${base} bg-neutral-200 text-neutral-700`;
  }

  protected filterPillClass(active: boolean): string {
    const base =
      'rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30';
    return active
      ? `${base} border-primary bg-primary text-white`
      : `${base} border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary`;
  }
}
