const TIME_ZONE = 'Europe/Kyiv';

interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function partValue(date: Date, options: Intl.DateTimeFormatOptions, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
  const match = parts.find((part) => part.type === type);
  if (!match) throw new Error(`Missing date part: ${type}`);
  return match.value;
}

function civilInKyiv(date: Date): CivilDate {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return {
    year: Number(partValue(date, options, 'year')),
    month: Number(partValue(date, options, 'month')),
    day: Number(partValue(date, options, 'day')),
  };
}

function addCivilDays(date: CivilDate, days: number): CivilDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function mondayIndex(date: Date): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
  }).format(date);
  const index = WEEKDAY_INDEX[label];
  if (index === undefined) throw new Error(`Unexpected weekday: ${label}`);
  return index;
}

function zoneOffsetMs(instant: Date): number {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  const year = Number(partValue(instant, options, 'year'));
  const month = Number(partValue(instant, options, 'month'));
  const day = Number(partValue(instant, options, 'day'));
  let hour = Number(partValue(instant, options, 'hour'));
  const minute = Number(partValue(instant, options, 'minute'));
  const second = Number(partValue(instant, options, 'second'));
  if (hour === 24) hour = 0;
  return Date.UTC(year, month - 1, day, hour, minute, second) - instant.getTime();
}

function zonedMidnight(date: CivilDate): Date {
  const utcGuess = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0);
  const first = new Date(utcGuess - zoneOffsetMs(new Date(utcGuess)));
  return new Date(utcGuess - zoneOffsetMs(first));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Monday 00:00 Europe/Kyiv that contains `anchor`. */
export function startOfWeek(anchor: Date): Date {
  const monday = addCivilDays(civilInKyiv(anchor), -mondayIndex(anchor));
  return zonedMidnight(monday);
}

export function addWeeks(weekStart: Date, weeks: number): Date {
  return zonedMidnight(addCivilDays(civilInKyiv(weekStart), weeks * 7));
}

export function weekDays(weekStart: Date): Date[] {
  const monday = civilInKyiv(weekStart);
  return Array.from({ length: 7 }, (_, index) => zonedMidnight(addCivilDays(monday, index)));
}

export function weekRangeIso(weekStart: Date): { from: string; to: string } {
  return {
    from: weekStart.toISOString(),
    to: addWeeks(weekStart, 1).toISOString(),
  };
}

export function kyivDateKey(date: Date): string {
  const civil = civilInKyiv(date);
  return `${civil.year}-${pad(civil.month)}-${pad(civil.day)}`;
}

export function formatKyivDay(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatKyivTime(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatKyivDate(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatWeekSpan(weekStart: Date): string {
  const last = zonedMidnight(addCivilDays(civilInKyiv(weekStart), 6));
  const format = new Intl.DateTimeFormat('uk-UA', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
  });
  return `${format.format(weekStart)} — ${format.format(last)}`;
}
