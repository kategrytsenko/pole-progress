export const STUDIO_TIME_ZONE = 'Europe/Kyiv';

export const KYIV_TIME_GAP_MESSAGE =
  'Цього місцевого часу немає через перехід на літній час. Оберіть інший час.';

export class KyivTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KyivTimeError';
  }
}

interface CivilParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

const civilOptions: Intl.DateTimeFormatOptions = {
  timeZone: STUDIO_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function partValue(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  type: Intl.DateTimeFormatPartTypes,
): string {
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
  const match = parts.find((part) => part.type === type);
  if (!match) throw new Error(`Missing date part: ${type}`);
  return match.value;
}

export function kyivCivilParts(instant: Date): CivilParts {
  let hour = Number(partValue(instant, civilOptions, 'hour'));
  if (hour === 24) hour = 0;
  return {
    year: Number(partValue(instant, civilOptions, 'year')),
    month: Number(partValue(instant, civilOptions, 'month')),
    day: Number(partValue(instant, civilOptions, 'day')),
    hour,
    minute: Number(partValue(instant, civilOptions, 'minute')),
  };
}

function sameCivil(instant: Date, wanted: CivilParts): boolean {
  const actual = kyivCivilParts(instant);
  return (
    actual.year === wanted.year &&
    actual.month === wanted.month &&
    actual.day === wanted.day &&
    actual.hour === wanted.hour &&
    actual.minute === wanted.minute
  );
}

export function parseCivilDate(
  value: string,
): { readonly year: number; readonly month: number; readonly day: number } | null {
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function parseCivilTime(
  value: string,
): { readonly hour: number; readonly minute: number } | null {
  const match = TIME_RE.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Europe/Kyiv wall time as a UTC instant.
 * Kyiv is UTC+2 or UTC+3. A spring-forward gap has no match and throws.
 * When the autumn change repeats an hour, the earlier instant is kept:
 * the clock still shows the summer offset the first time that minute occurs.
 */
export function kyivWallTimeToDate(date: string, time: string): Date {
  const civilDate = parseCivilDate(date);
  const civilTime = parseCivilTime(time);
  if (!civilDate || !civilTime) {
    throw new KyivTimeError('Вкажіть дату та час початку заняття.');
  }

  const wanted: CivilParts = { ...civilDate, ...civilTime };
  const matches = [2, 3]
    .map(
      (offsetHours) =>
        new Date(
          Date.UTC(
            wanted.year,
            wanted.month - 1,
            wanted.day,
            wanted.hour - offsetHours,
            wanted.minute,
            0,
            0,
          ),
        ),
    )
    .filter((instant) => sameCivil(instant, wanted))
    .sort((left, right) => left.getTime() - right.getTime());

  const first = matches[0];
  if (!first) throw new KyivTimeError(KYIV_TIME_GAP_MESSAGE);
  return first;
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

export function kyivDateAndTime(iso: string): { readonly date: string; readonly time: string } {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) {
    throw new KyivTimeError('Вкажіть дату та час початку заняття.');
  }
  const parts = kyivCivilParts(instant);
  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
  };
}

export function addCivilDays(date: string, days: number): string {
  const civil = parseCivilDate(date);
  if (!civil) throw new KyivTimeError('Вкажіть дату заняття.');
  const next = new Date(Date.UTC(civil.year, civil.month - 1, civil.day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function kyivToday(now: Date): string {
  const parts = kyivCivilParts(now);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function weekdayIndex(instant: Date): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    weekday: 'short',
  }).format(instant);
  const index: Readonly<Record<string, number>> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const value = index[label];
  if (value === undefined) throw new Error(`Unexpected weekday: ${label}`);
  return value;
}

/** Monday through Sunday as `YYYY-MM-DD` in Europe/Kyiv. */
export function currentKyivWeekDates(now: Date): { readonly from: string; readonly to: string } {
  const today = kyivToday(now);
  const monday = addCivilDays(today, -weekdayIndex(now));
  return { from: monday, to: addCivilDays(monday, 6) };
}

/**
 * Inclusive Kyiv dates for `list_sessions_in_range`.
 * `to` is the next local midnight and is exclusive.
 */
export function kyivInclusiveDateRangeIso(
  fromDate: string,
  toDate: string,
): { readonly from: string; readonly to: string } {
  if (!parseCivilDate(fromDate) || !parseCivilDate(toDate) || fromDate > toDate) {
    throw new KyivTimeError('Вкажіть період: дата початку не пізніше за дату кінця.');
  }
  return {
    from: kyivWallTimeToDate(fromDate, '00:00').toISOString(),
    to: kyivWallTimeToDate(addCivilDays(toDate, 1), '00:00').toISOString(),
  };
}

export function formatKyivDate(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: STUDIO_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatKyivTime(iso: string): string {
  return kyivDateAndTime(iso).time;
}
