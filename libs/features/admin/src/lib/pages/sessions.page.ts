import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfilesApi, type StudioProfile } from '@org/auth';
import {
  ScheduleApi,
  SESSION_STATUS_LABEL,
  classTypesForSessionForm,
  currentKyivWeekDates,
  formatKyivDate,
  formatKyivTime,
  instantInHalfOpenRange,
  instructorChoices,
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
  type ClassSessionCard,
  type ClassType,
  type InstructorChoice,
} from '@org/data';
import { StateBlockComponent, ToastService } from '@org/shell';

const FIELD_CLASS =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

function profileLabel(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : 'Без імені';
}

@Component({
  selector: 'pp-admin-sessions',
  imports: [FormsModule, StateBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-8">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Заняття</h1>
        <p class="mt-1 max-w-3xl text-sm text-neutral-600">
          Типи занять і окремі заняття в розкладі. Дата й час вводяться за Києвом. Скасування змінює лише статус заняття.
        </p>
      </header>

      <section class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Типи занять</h2>
          <p class="mt-1 text-sm text-neutral-600">
            Неактивний тип не пропонується для нових занять і зникає з фільтра в розкладі клієнта. Уже створені заняття залишаються.
          </p>
        </div>

        <form novalidate (submit)="saveType($event)" class="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label class="flex flex-col gap-1 text-sm sm:col-span-2">
              <span class="font-medium text-neutral-700">Назва</span>
              <input
                type="text"
                required
                maxlength="120"
                name="typeName"
                [ngModel]="typeName()"
                (ngModelChange)="typeName.set($event)"
                [class]="fieldClass"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Тривалість, хв</span>
              <input
                type="number"
                required
                min="1"
                step="1"
                name="typeDuration"
                [ngModel]="typeDuration()"
                (ngModelChange)="typeDuration.set($event)"
                [class]="fieldClass"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Місткість за замовчуванням</span>
              <input
                type="number"
                required
                min="1"
                step="1"
                name="typeCapacity"
                [ngModel]="typeCapacity()"
                (ngModelChange)="typeCapacity.set($event)"
                [class]="fieldClass"
              />
            </label>
          </div>
          <label class="flex items-center gap-2 text-sm text-neutral-800">
            <input
              type="checkbox"
              name="typeActive"
              [ngModel]="typeActive()"
              (ngModelChange)="typeActive.set($event)"
              class="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
            />
            Активний тип
          </label>
          @if (typeError(); as message) {
            <p role="alert" class="text-sm text-red-700">{{ message }}</p>
          }
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              [disabled]="savingType()"
              class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
            >{{ savingType() ? 'Збереження…' : editingTypeId() ? 'Зберегти тип' : 'Додати тип' }}</button>
            @if (editingTypeId()) {
              <button
                type="button"
                (click)="resetTypeForm()"
                class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >Новий тип</button>
            }
          </div>
        </form>

        @if (types().length > 0) {
          <ul class="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm shadow-sm">
            @for (type of types(); track type.id) {
              <li class="flex flex-wrap items-center gap-3 px-4 py-3">
                <span class="min-w-40 flex-1 font-medium text-neutral-900">{{ type.name }}</span>
                <span class="text-neutral-600">{{ type.duration_min }} хв</span>
                <span class="text-neutral-600">місткість {{ type.default_capacity }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  [class.bg-emerald-50]="type.active"
                  [class.text-emerald-800]="type.active"
                  [class.bg-neutral-100]="!type.active"
                  [class.text-neutral-600]="!type.active"
                >{{ type.active ? 'Активний' : 'Неактивний' }}</span>
                <button
                  type="button"
                  (click)="editType(type)"
                  class="rounded-md px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >Змінити</button>
              </li>
            }
          </ul>
        }
      </section>

      <section class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Заняття в розкладі</h2>
          <p class="mt-1 text-sm text-neutral-600">
            Тривалість і місткість підставляються з типу, і для конкретного заняття їх можна змінити.
          </p>
        </div>

        <form novalidate (submit)="showRange($event)" class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <label class="flex flex-1 flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-700">Від</span>
            <input
              type="date"
              required
              name="rangeFrom"
              [ngModel]="rangeFrom()"
              (ngModelChange)="rangeFrom.set($event)"
              [class]="fieldClass"
            />
          </label>
          <label class="flex flex-1 flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-700">До</span>
            <input
              type="date"
              required
              name="rangeTo"
              [ngModel]="rangeTo()"
              (ngModelChange)="rangeTo.set($event)"
              [class]="fieldClass"
            />
          </label>
          <button
            type="submit"
            class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800"
          >Показати</button>
          <button
            type="button"
            (click)="showThisWeek()"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-100"
          >Цей тиждень</button>
        </form>
        @if (rangeError(); as message) {
          <p role="alert" class="text-sm text-red-700">{{ message }}</p>
        }

        <form novalidate (submit)="saveSession($event)" class="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 class="text-sm font-semibold text-neutral-900">
            {{ editingSessionId() ? 'Змінити заняття' : 'Нове заняття' }}
          </h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Тип заняття</span>
              <select
                required
                name="sessionType"
                [ngModel]="sessionTypeId()"
                (ngModelChange)="onSessionType($event)"
                [class]="fieldClass"
              >
                <option value="">Оберіть тип</option>
                @for (type of sessionTypeOptions(); track type.id) {
                  <option [value]="type.id">{{ type.name }}{{ type.active ? '' : ' (неактивний)' }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Викладач</span>
              <select
                required
                name="sessionInstructor"
                [ngModel]="instructorId()"
                (ngModelChange)="onInstructor($event)"
                [class]="fieldClass"
              >
                <option value="">Оберіть профіль</option>
                @for (choice of instructorOptions(); track choice.id) {
                  <option [value]="choice.id">{{ choice.label }}</option>
                }
              </select>
              <span class="text-xs text-neutral-500">
                Оберіть існуючий профіль людини, яка веде заняття. Вибір не змінює роль цього профілю.
              </span>
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Дата</span>
              <input
                type="date"
                required
                name="sessionDate"
                [ngModel]="sessionDate()"
                (ngModelChange)="onSessionDate($event)"
                [class]="fieldClass"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Початок</span>
              <input
                type="time"
                required
                name="sessionTime"
                [ngModel]="sessionTime()"
                (ngModelChange)="onSessionTime($event)"
                [class]="fieldClass"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Тривалість, хв</span>
              <input
                type="number"
                required
                min="1"
                step="1"
                name="sessionDuration"
                [ngModel]="durationMin()"
                (ngModelChange)="onDuration($event)"
                [class]="fieldClass"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-neutral-700">Місткість</span>
              <input
                type="number"
                required
                min="1"
                step="1"
                name="sessionCapacity"
                [ngModel]="capacity()"
                (ngModelChange)="onCapacity($event)"
                [class]="fieldClass"
              />
            </label>
          </div>

          @if (editingSessionId()) {
            <p class="text-sm text-neutral-600">Активних записів: {{ editingBookedCount() }}.</p>
          }
          @if (sessionTypeOptions().length === 0) {
            <p class="text-sm text-amber-800">Немає активних типів занять. Створіть або увімкніть тип.</p>
          }
          @if (sessionError(); as message) {
            <p role="alert" class="text-sm text-red-700">{{ message }}</p>
          }
          @if (reschedulePrompt(); as prompt) {
            <div class="space-y-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              <p>{{ prompt }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  [disabled]="savingSession()"
                  (click)="saveSession($event, true)"
                  class="rounded-md bg-amber-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >Продовжити</button>
                <button
                  type="button"
                  (click)="reschedulePrompt.set(null)"
                  class="rounded-md px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
                >Повернутись</button>
              </div>
            </div>
          }
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              [disabled]="savingSession()"
              class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
            >{{ savingSession() ? 'Збереження…' : editingSessionId() ? 'Зберегти заняття' : 'Додати заняття' }}</button>
            @if (editingSessionId()) {
              <button
                type="button"
                (click)="resetSessionForm()"
                class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >Нове заняття</button>
            }
          </div>
        </form>

        @if (loading()) {
          <pp-state-block mode="loading" />
        } @else if (loadError(); as message) {
          <div class="space-y-3">
            <pp-state-block mode="error" [message]="message" />
            <button
              type="button"
              (click)="reload()"
              class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-100"
            >Спробувати ще раз</button>
          </div>
        } @else if (rangeError()) {
          <p class="text-sm text-neutral-600">Список оновиться, коли період буде коректним.</p>
        } @else if (visibleSessions().length === 0) {
          <pp-state-block mode="empty" message="У цьому періоді занять немає." />
        } @else {
          <div class="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
            <table class="min-w-full divide-y divide-neutral-200 text-sm">
              <thead class="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" class="px-4 py-3">Дата</th>
                  <th scope="col" class="px-4 py-3">Час</th>
                  <th scope="col" class="px-4 py-3">Тип</th>
                  <th scope="col" class="px-4 py-3">Викладач</th>
                  <th scope="col" class="px-4 py-3">Місткість</th>
                  <th scope="col" class="px-4 py-3">Активні записи</th>
                  <th scope="col" class="px-4 py-3">Статус</th>
                  <th scope="col" class="px-4 py-3"><span class="sr-only">Дії</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                @for (session of visibleSessions(); track session.id) {
                  <tr class="align-top">
                    <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(session.starts_at) }}</td>
                    <td class="px-4 py-3 whitespace-nowrap">{{ formatTime(session.starts_at) }}–{{ formatTime(session.ends_at) }}</td>
                    <td class="px-4 py-3">{{ session.type_name }}</td>
                    <td class="px-4 py-3">{{ label(session.instructor_name) }}</td>
                    <td class="px-4 py-3">{{ session.capacity }}</td>
                    <td class="px-4 py-3">{{ session.booked_count }}</td>
                    <td class="px-4 py-3">
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium"
                        [class.bg-neutral-100]="session.status === 'cancelled'"
                        [class.text-neutral-600]="session.status === 'cancelled'"
                        [class.bg-emerald-50]="session.status !== 'cancelled'"
                        [class.text-emerald-800]="session.status !== 'cancelled'"
                      >{{ statusLabel(session.status) }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex flex-wrap gap-2">
                        <button
                          type="button"
                          (click)="editSession(session)"
                          class="rounded-md px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                        >Змінити</button>
                        @if (session.status === 'scheduled') {
                          <button
                            type="button"
                            (click)="askCancel(session)"
                            class="rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                          >Скасувати заняття</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (cancelTarget(); as target) {
          <div class="space-y-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            <p>{{ cancelMessage() }}</p>
            @if (cancelError(); as message) {
              <p role="alert">{{ message }}</p>
            }
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                [disabled]="cancelling()"
                (click)="confirmCancel()"
                class="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >{{ cancelling() ? 'Скасування…' : 'Скасувати заняття' }}</button>
              <button
                type="button"
                (click)="cancelTarget.set(null)"
                class="rounded-md px-3 py-2 text-sm font-medium text-red-950 hover:bg-red-100"
              >Залишити</button>
            </div>
            <p class="text-xs text-red-900">{{ target.type_name }}, {{ formatDate(target.starts_at) }}</p>
          </div>
        }
      </section>
    </section>
  `,
})
export class SessionsPage implements OnInit {
  private readonly schedule = inject(ScheduleApi);
  private readonly profilesApi = inject(ProfilesApi);
  private readonly toasts = inject(ToastService);

  protected readonly fieldClass = FIELD_CLASS;
  protected readonly formatDate = formatKyivDate;
  protected readonly formatTime = formatKyivTime;
  protected readonly label = profileLabel;
  protected readonly statusLabel = (status: ClassSessionCard['status']): string =>
    SESSION_STATUS_LABEL[status];

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly rangeError = signal<string | null>(null);
  protected readonly rangeFrom = signal('');
  protected readonly rangeTo = signal('');
  protected readonly types = signal<ClassType[]>([]);
  private readonly profiles = signal<StudioProfile[]>([]);
  private readonly sessions = signal<ClassSessionCard[]>([]);

  protected readonly typeName = signal('');
  protected readonly typeDuration = signal<number | null>(null);
  protected readonly typeCapacity = signal<number | null>(null);
  protected readonly typeActive = signal(true);
  protected readonly editingTypeId = signal<string | null>(null);
  protected readonly typeError = signal<string | null>(null);
  protected readonly savingType = signal(false);

  protected readonly sessionTypeId = signal('');
  protected readonly instructorId = signal('');
  protected readonly sessionDate = signal('');
  protected readonly sessionTime = signal('');
  protected readonly durationMin = signal<number | null>(null);
  protected readonly capacity = signal<number | null>(null);
  protected readonly editingSessionId = signal<string | null>(null);
  protected readonly editingBookedCount = signal(0);
  private readonly sessionTypeAnchor = signal<string | null>(null);
  private readonly editingBaseline = signal<{
    instructorId: string;
    startsAt: string;
    endsAt: string;
  } | null>(null);
  protected readonly sessionError = signal<string | null>(null);
  protected readonly reschedulePrompt = signal<string | null>(null);
  protected readonly savingSession = signal(false);
  protected readonly cancelTarget = signal<ClassSessionCard | null>(null);
  protected readonly cancelError = signal<string | null>(null);
  protected readonly cancelling = signal(false);

  protected readonly visibleSessions = computed(() => sortSessionsByStart(this.sessions()));
  protected readonly sessionTypeOptions = computed(() =>
    classTypesForSessionForm(this.types(), this.sessionTypeAnchor()),
  );
  protected readonly instructorOptions = computed<InstructorChoice[]>(() => {
    const choices = instructorChoices(this.profiles());
    const current = this.instructorId();
    if (!current || choices.some((choice) => choice.id === current)) return choices;
    return [...choices, { id: current, label: profileLabel(null) }];
  });
  protected readonly cancelMessage = computed(() => {
    const target = this.cancelTarget();
    return target ? sessionCancelPrompt(target.booked_count) : '';
  });

  async ngOnInit(): Promise<void> {
    const week = currentKyivWeekDates(new Date());
    this.rangeFrom.set(week.from);
    this.rangeTo.set(week.to);
    this.sessionDate.set(week.from);
    await this.reload();
  }

  protected async showRange(event: Event): Promise<void> {
    event.preventDefault();
    await this.reload();
  }

  protected async showThisWeek(): Promise<void> {
    const week = currentKyivWeekDates(new Date());
    this.rangeFrom.set(week.from);
    this.rangeTo.set(week.to);
    await this.reload();
  }

  protected async reload(): Promise<void> {
    const range = sessionListRange(this.rangeFrom(), this.rangeTo());
    if (!range.ok) {
      this.rangeError.set(range.error);
      this.loading.set(false);
      return;
    }

    this.rangeError.set(null);
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [types, profiles, sessions] = await Promise.all([
        this.schedule.listClassTypes(),
        this.profilesApi.listProfiles(),
        this.schedule.listSessionsInRange(range.value),
      ]);
      this.types.set(types);
      this.profiles.set(profiles);
      this.sessions.set(sessions);
    } catch (error) {
      this.loadError.set(sessionWriteErrorMessage(error, 'Не вдалося завантажити заняття.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected editType(type: ClassType): void {
    this.editingTypeId.set(type.id);
    this.typeName.set(type.name);
    this.typeDuration.set(type.duration_min);
    this.typeCapacity.set(type.default_capacity);
    this.typeActive.set(type.active);
    this.typeError.set(null);
  }

  protected resetTypeForm(): void {
    this.editingTypeId.set(null);
    this.typeName.set('');
    this.typeDuration.set(null);
    this.typeCapacity.set(null);
    this.typeActive.set(true);
    this.typeError.set(null);
  }

  protected async saveType(event: Event): Promise<void> {
    event.preventDefault();
    if (this.savingType()) return;
    this.savingType.set(true);
    this.typeError.set(null);
    const draft = {
      name: this.typeName(),
      durationMin: this.typeDuration(),
      defaultCapacity: this.typeCapacity(),
      active: this.typeActive(),
    };
    const editingId = this.editingTypeId();
    try {
      if (editingId) await this.schedule.updateClassType(editingId, draft);
      else await this.schedule.createClassType(draft);
      this.toasts.success('Тип заняття збережено.');
      this.resetTypeForm();
      await this.reload();
    } catch (error) {
      this.typeError.set(sessionWriteErrorMessage(error, 'Не вдалося зберегти тип заняття.'));
    } finally {
      this.savingType.set(false);
    }
  }

  protected onSessionType(typeId: string): void {
    this.sessionTypeId.set(typeId);
    this.clearReschedulePrompt();
    const type = this.types().find((item) => item.id === typeId);
    if (!type) return;
    const defaults = sessionDefaultsFromType(type);
    this.durationMin.set(defaults.durationMin);
    this.capacity.set(defaults.capacity);
  }

  protected onInstructor(instructorId: string): void {
    this.instructorId.set(instructorId);
    this.clearReschedulePrompt();
  }

  protected onSessionDate(date: string): void {
    this.sessionDate.set(date);
    this.clearReschedulePrompt();
  }

  protected onSessionTime(time: string): void {
    this.sessionTime.set(time);
    this.clearReschedulePrompt();
  }

  protected onDuration(value: unknown): void {
    this.durationMin.set(formNumber(value));
    this.clearReschedulePrompt();
  }

  protected onCapacity(value: unknown): void {
    this.capacity.set(formNumber(value));
  }

  protected editSession(session: ClassSessionCard): void {
    const draft = sessionDraftFromCard(session);
    this.editingSessionId.set(session.id);
    this.editingBookedCount.set(session.booked_count);
    this.sessionTypeAnchor.set(session.type_id);
    this.editingBaseline.set({
      instructorId: session.instructor_id,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
    });
    this.sessionTypeId.set(draft.typeId);
    this.instructorId.set(draft.instructorId);
    this.sessionDate.set(draft.date);
    this.sessionTime.set(draft.startTime);
    this.durationMin.set(draft.durationMin);
    this.capacity.set(draft.capacity);
    this.sessionError.set(null);
    this.reschedulePrompt.set(null);
  }

  protected resetSessionForm(): void {
    this.editingSessionId.set(null);
    this.editingBookedCount.set(0);
    this.sessionTypeAnchor.set(null);
    this.editingBaseline.set(null);
    this.sessionTypeId.set('');
    this.instructorId.set('');
    this.sessionDate.set(this.rangeFrom() || currentKyivWeekDates(new Date()).from);
    this.sessionTime.set('');
    this.durationMin.set(null);
    this.capacity.set(null);
    this.sessionError.set(null);
    this.reschedulePrompt.set(null);
  }

  protected async saveSession(event: Event, confirmed = false): Promise<void> {
    event.preventDefault();
    if (this.savingSession()) return;

    const draft = {
      typeId: this.sessionTypeId(),
      instructorId: this.instructorId(),
      date: this.sessionDate(),
      startTime: this.sessionTime(),
      durationMin: this.durationMin(),
      capacity: this.capacity(),
    };
    const editingId = this.editingSessionId();
    const activeBookings = editingId ? this.editingBookedCount() : 0;
    if (
      draft.typeId &&
      !sessionTypeIsOffered(this.types(), draft.typeId, this.sessionTypeAnchor())
    ) {
      this.sessionError.set('Неактивний тип не можна обрати для нового заняття.');
      this.reschedulePrompt.set(null);
      return;
    }

    const written = sessionWrite(draft, activeBookings);
    if (!written.ok) {
      this.sessionError.set(written.error);
      this.reschedulePrompt.set(null);
      return;
    }

    const baseline = this.editingBaseline();
    if (
      editingId &&
      baseline &&
      !confirmed &&
      sessionChangeNeedsConfirmation(activeBookings, baseline, {
        instructorId: written.value.instructor_id,
        startsAt: written.value.starts_at,
        endsAt: written.value.ends_at,
      })
    ) {
      this.sessionError.set(null);
      this.reschedulePrompt.set(sessionReschedulePrompt(activeBookings));
      return;
    }

    this.savingSession.set(true);
    this.sessionError.set(null);
    this.reschedulePrompt.set(null);
    try {
      const saved = editingId
        ? await this.schedule.updateSession(editingId, draft, activeBookings)
        : await this.schedule.createSession(draft);
      const range = sessionListRange(this.rangeFrom(), this.rangeTo());
      const outside = range.ok && !instantInHalfOpenRange(saved.starts_at, range.value);
      this.toasts.success(savedSessionMessage(Boolean(editingId), outside));
      this.resetSessionForm();
      await this.reload();
    } catch (error) {
      this.sessionError.set(sessionWriteErrorMessage(error, 'Не вдалося зберегти заняття.'));
    } finally {
      this.savingSession.set(false);
    }
  }

  protected askCancel(session: ClassSessionCard): void {
    this.cancelError.set(null);
    this.cancelTarget.set(session);
  }

  protected async confirmCancel(): Promise<void> {
    const target = this.cancelTarget();
    if (!target || this.cancelling()) return;
    this.cancelling.set(true);
    try {
      await this.schedule.cancelSession(target.id);
      this.cancelTarget.set(null);
      this.toasts.success('Заняття скасовано. Записи і кредити абонементів не змінено.');
      await this.reload();
    } catch (error) {
      this.cancelError.set(sessionWriteErrorMessage(error, 'Не вдалося скасувати заняття.'));
    } finally {
      this.cancelling.set(false);
    }
  }

  private clearReschedulePrompt(): void {
    if (this.reschedulePrompt() !== null) this.reschedulePrompt.set(null);
  }
}

function formNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function savedSessionMessage(editing: boolean, outsideRange: boolean): string {
  if (outsideRange) return 'Заняття збережено. Змініть період, щоб побачити його в списку.';
  if (editing) return 'Зміни збережено.';
  return 'Заняття збережено.';
}
