import {
  addMinutes,
  kyivDateAndTime,
  kyivInclusiveDateRangeIso,
  kyivWallTimeToDate,
  KyivTimeError,
  parseCivilDate,
  parseCivilTime,
} from './kyiv-time';
import type { ClassSessionStatus, ClassType } from './models';

export const CLASS_TYPE_NAME_REQUIRED = 'Вкажіть назву типу заняття.';
export const DURATION_INVALID = 'Тривалість має бути додатним цілим числом хвилин.';
export const CAPACITY_INVALID = 'Місткість має бути додатним цілим числом.';
export const TYPE_REQUIRED = 'Оберіть тип заняття.';
export const INSTRUCTOR_REQUIRED = 'Оберіть профіль викладача.';
export const DATE_REQUIRED = 'Вкажіть дату заняття.';
export const TIME_REQUIRED = 'Вкажіть час початку.';
export const ADMIN_WRITE_DENIED =
  'Недостатньо прав. Змінювати типи занять і розклад може лише адміністратор.';

export interface ClassTypeDraft {
  readonly name: string;
  readonly durationMin: unknown;
  readonly defaultCapacity: unknown;
  readonly active: boolean;
}

export interface ClassTypeWrite {
  readonly name: string;
  readonly duration_min: number;
  readonly default_capacity: number;
  readonly active: boolean;
}

export interface SessionDraft {
  readonly typeId: string;
  readonly instructorId: string;
  readonly date: string;
  readonly startTime: string;
  readonly durationMin: unknown;
  readonly capacity: unknown;
}

export interface SessionWrite {
  readonly type_id: string;
  readonly instructor_id: string;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly capacity: number;
}

export interface NewSessionInsert extends SessionWrite {
  readonly status: 'scheduled';
}

export type FormResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

export interface SessionScheduleIdentity {
  readonly instructorId: string;
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface InstructorChoice {
  readonly id: string;
  readonly label: string;
}

export const SESSION_STATUS_LABEL: Readonly<Record<ClassSessionStatus, string>> = {
  scheduled: 'Заплановано',
  cancelled: 'Скасовано',
};

export function positiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function classTypeWrite(draft: ClassTypeDraft): FormResult<ClassTypeWrite> {
  const name = draft.name.trim();
  if (!name) return { ok: false, error: CLASS_TYPE_NAME_REQUIRED };
  const duration = positiveInt(draft.durationMin);
  if (duration === null) return { ok: false, error: DURATION_INVALID };
  const capacity = positiveInt(draft.defaultCapacity);
  if (capacity === null) return { ok: false, error: CAPACITY_INVALID };
  return {
    ok: true,
    value: {
      name,
      duration_min: duration,
      default_capacity: capacity,
      active: draft.active === true,
    },
  };
}

export function capacityError(capacity: number, activeBookings: number): string | null {
  if (!Number.isInteger(capacity) || capacity <= 0) return CAPACITY_INVALID;
  if (!Number.isInteger(activeBookings) || activeBookings < 0) {
    return 'Не вдалося перевірити кількість активних записів.';
  }
  if (capacity < activeBookings) {
    return `Місткість не може бути меншою за кількість активних записів (${activeBookings}).`;
  }
  return null;
}

export function sessionWrite(draft: SessionDraft, activeBookings: number): FormResult<SessionWrite> {
  if (!draft.typeId.trim()) return { ok: false, error: TYPE_REQUIRED };
  if (!draft.instructorId.trim()) return { ok: false, error: INSTRUCTOR_REQUIRED };
  if (!parseCivilDate(draft.date)) return { ok: false, error: DATE_REQUIRED };
  if (!parseCivilTime(draft.startTime)) return { ok: false, error: TIME_REQUIRED };
  const duration = positiveInt(draft.durationMin);
  if (duration === null) return { ok: false, error: DURATION_INVALID };
  const capacity = positiveInt(draft.capacity);
  if (capacity === null) return { ok: false, error: CAPACITY_INVALID };
  const tooSmall = capacityError(capacity, activeBookings);
  if (tooSmall) return { ok: false, error: tooSmall };

  let starts: Date;
  try {
    starts = kyivWallTimeToDate(draft.date, draft.startTime);
  } catch (error) {
    if (error instanceof KyivTimeError) return { ok: false, error: error.message };
    throw error;
  }

  return {
    ok: true,
    value: {
      type_id: draft.typeId,
      instructor_id: draft.instructorId,
      starts_at: starts.toISOString(),
      ends_at: addMinutes(starts, duration).toISOString(),
      capacity,
    },
  };
}

/** Insert payload. Status is scheduled. Existing bookings are not part of this write. */
export function newSessionInsert(draft: SessionDraft): FormResult<NewSessionInsert> {
  const row = sessionWrite(draft, 0);
  if (!row.ok) return row;
  return { ok: true, value: { ...row.value, status: 'scheduled' } };
}

/** Status-only update. Callers must not delete bookings or change pass credits with this patch. */
export function sessionCancelPatch(): { readonly status: 'cancelled' } {
  return { status: 'cancelled' };
}

export function applySessionCancel<
  TSession extends { status: ClassSessionStatus },
  TBooking,
  TPass,
>(
  session: TSession,
  bookings: readonly TBooking[],
  pass: TPass,
): { readonly session: TSession; readonly bookings: readonly TBooking[]; readonly pass: TPass } {
  return {
    session: { ...session, status: 'cancelled' },
    bookings,
    pass,
  };
}

export function sessionChangeNeedsConfirmation(
  activeBookings: number,
  current: SessionScheduleIdentity,
  next: SessionScheduleIdentity,
): boolean {
  if (!Number.isInteger(activeBookings) || activeBookings <= 0) return false;
  return (
    current.instructorId !== next.instructorId ||
    Date.parse(current.startsAt) !== Date.parse(next.startsAt) ||
    Date.parse(current.endsAt) !== Date.parse(next.endsAt)
  );
}

export function sessionReschedulePrompt(activeBookings: number): string {
  return `На це заняття є активних записів: ${activeBookings}. Зміна часу або викладача не скасовує ці записи і не змінює кредити абонементів. Продовжити?`;
}

export function sessionCancelPrompt(activeBookings: number): string {
  const records =
    activeBookings > 0
      ? `Активних записів: ${activeBookings}. Вони залишаться.`
      : 'Активних записів немає.';
  return `Скасувати це заняття? Статус стане «Скасовано». ${records} Кредити абонементів не зміняться.`;
}

export function classTypesForClientFilter<T extends { active: boolean }>(types: readonly T[]): T[] {
  return types.filter((type) => type.active);
}

export function classTypesForSessionForm<T extends { id: string; active: boolean }>(
  types: readonly T[],
  currentTypeId: string | null,
): T[] {
  return types.filter(
    (type) => type.active || (currentTypeId !== null && type.id === currentTypeId),
  );
}

export function sessionTypeIsOffered(
  types: readonly { readonly id: string; readonly active: boolean }[],
  typeId: string,
  anchorTypeId: string | null,
): boolean {
  return classTypesForSessionForm(types, anchorTypeId).some((type) => type.id === typeId);
}

export function sessionDefaultsFromType(
  type: Pick<ClassType, 'duration_min' | 'default_capacity'>,
): { readonly durationMin: number; readonly capacity: number } {
  return { durationMin: type.duration_min, capacity: type.default_capacity };
}

export function durationMinutesBetween(startsAt: string, endsAt: string): number | null {
  const ms = Date.parse(endsAt) - Date.parse(startsAt);
  if (!Number.isFinite(ms) || ms <= 0 || ms % 60_000 !== 0) return null;
  const minutes = ms / 60_000;
  if (!Number.isSafeInteger(minutes)) return null;
  return minutes;
}

export function sessionDraftFromCard(card: {
  readonly type_id: string;
  readonly instructor_id: string;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly capacity: number;
}): {
  readonly typeId: string;
  readonly instructorId: string;
  readonly date: string;
  readonly startTime: string;
  readonly durationMin: number | null;
  readonly capacity: number;
} {
  const when = kyivDateAndTime(card.starts_at);
  return {
    typeId: card.type_id,
    instructorId: card.instructor_id,
    date: when.date,
    startTime: when.time,
    durationMin: durationMinutesBetween(card.starts_at, card.ends_at),
    capacity: card.capacity,
  };
}

export function instructorChoices(
  profiles: readonly { readonly id: string; readonly name: string | null }[],
): InstructorChoice[] {
  const names = profiles.map((profile) => displayName(profile.name));
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);

  return profiles
    .map((profile, index) => {
      const name = names[index] ?? 'Без імені';
      const duplicated = (counts.get(name) ?? 0) > 1;
      const label = duplicated ? `${name} · ${profile.id.slice(0, 8)}` : name;
      return { id: profile.id, label };
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'uk') || left.id.localeCompare(right.id));
}

export function sortSessionsByStart<T extends { starts_at: string; id: string }>(
  sessions: readonly T[],
): T[] {
  return [...sessions].sort((left, right) => {
    const byTime = Date.parse(left.starts_at) - Date.parse(right.starts_at);
    if (byTime !== 0) return byTime;
    return left.id.localeCompare(right.id);
  });
}

export function sessionListRange(
  fromDate: string,
  toDate: string,
): FormResult<{ readonly from: string; readonly to: string }> {
  try {
    return { ok: true, value: kyivInclusiveDateRangeIso(fromDate, toDate) };
  } catch (error) {
    if (error instanceof KyivTimeError) return { ok: false, error: error.message };
    throw error;
  }
}

export function instantInHalfOpenRange(
  iso: string,
  range: { readonly from: string; readonly to: string },
): boolean {
  const time = Date.parse(iso);
  return time >= Date.parse(range.from) && time < Date.parse(range.to);
}

export function sessionWriteErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  const message = errorMessage(error);
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return ADMIN_WRITE_DENIED;
  }
  if (code === 'PGRST116') {
    return 'Не вдалося зберегти зміни. Перевірте права адміністратора або оновіть список.';
  }
  if (code === '23514') return 'Перевірте тривалість, місткість і час завершення.';
  if (code === '23503') return 'Обраний тип заняття або профіль більше не існує.';
  if (/[А-Яа-яІіЇїЄєҐґ]/.test(message)) return message;
  return fallback;
}

function displayName(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : 'Без імені';
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code : '';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== 'object' || !('message' in error)) return '';
  return typeof error.message === 'string' ? error.message : '';
}
