/** `YYYY-MM-DD` in the studio browser's local calendar. */
export function todayInputDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function inputDateFromIso(iso: string): string {
  return todayInputDate(new Date(iso));
}

export function addInputDays(date: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const next = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  next.setDate(next.getDate() + days);
  return todayInputDate(next);
}

/** Inclusive local day, stored as timestamptz for `valid_from`. */
export function inputDateStartIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** Inclusive local day, stored as timestamptz for `valid_until`. */
export function inputDateEndIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}
