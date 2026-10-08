import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { StateBlockComponent, ToastService } from '@org/shell';
import { ScheduleStore } from '../schedule.store';

const BOOKING_ERRORS: readonly { code: string; message: string }[] = [
  { code: 'class_full', message: 'На це заняття вже немає місць.' },
  { code: 'no_pass', message: 'Немає активного абонемента з заняттями.' },
  { code: 'already_booked', message: 'Ви вже записані на це заняття.' },
  { code: 'session_unavailable', message: 'Це заняття вже недоступне для запису.' },
  { code: 'booking_not_found', message: 'Запис не знайдено.' },
  { code: 'not_allowed', message: 'Немає прав скасувати цей запис.' },
  { code: 'not_authenticated', message: 'Увійдіть, щоб змінити запис.' },
];

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
  imports: [StateBlockComponent],
  providers: [ScheduleStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Розклад</h1>
          <p class="mt-1 text-sm text-neutral-600">
            Скасування раніше ніж за {{ store.cutoffHours() }} год до початку повертає заняття на абонемент.
          </p>
        </div>
      </header>

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
        <ol class="space-y-4">
          @for (day of store.days(); track day.key) {
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
                <p class="mt-2 text-sm text-neutral-500">Немає занять</p>
              } @else {
                <ul class="mt-3 grid gap-3 lg:grid-cols-2">
                  @for (session of day.sessions; track session.id) {
                    <li
                      class="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3"
                      [class.opacity-60]="session.cancelled"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <p class="text-sm font-semibold text-neutral-900">{{ session.typeName }}</p>
                          <p class="mt-0.5 text-sm text-neutral-600">{{ session.timeLabel }}</p>
                          <p class="mt-0.5 text-xs text-neutral-500">{{ session.instructorName }}</p>
                        </div>
                        <p
                          class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                          [class.bg-red-50]="session.full && !session.cancelled"
                          [class.text-red-700]="session.full && !session.cancelled"
                          [class.bg-neutral-100]="!session.full || session.cancelled"
                          [class.text-neutral-600]="!session.full || session.cancelled"
                        >
                          {{ session.capacityLabel }}
                        </p>
                      </div>

                      <div class="flex flex-wrap items-center gap-2">
                        @if (session.booked) {
                          <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Ви записані
                          </span>
                          <button
                            type="button"
                            (click)="onCancel(session.id)"
                            [disabled]="store.pendingSessionId() !== null"
                            class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {{ store.pendingSessionId() === session.id ? 'Скасування…' : 'Скасувати запис' }}
                          </button>
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
    </section>
  `,
})
export class SchedulePage implements OnInit {
  protected readonly store = inject(ScheduleStore);
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    void this.store.load();
  }

  protected onShiftWeek(delta: number): void {
    void this.store.shiftWeek(delta);
  }

  protected onCurrentWeek(): void {
    void this.store.goToCurrentWeek();
  }

  protected onTypeChange(typeId: string | null): void {
    void this.store.setType(typeId);
  }

  protected onRetry(): void {
    void this.store.load();
  }

  protected async onBook(sessionId: string): Promise<void> {
    try {
      const booked = await this.store.book(sessionId);
      if (booked) this.toast.success('Вас записано на заняття.');
    } catch (err) {
      this.toast.error(bookingErrorMessage(err));
    }
  }

  protected async onCancel(sessionId: string): Promise<void> {
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

  protected filterPillClass(active: boolean): string {
    const base =
      'rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30';
    return active
      ? `${base} border-primary bg-primary text-white`
      : `${base} border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary`;
  }
}
