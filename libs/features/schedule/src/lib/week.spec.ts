import { addWeeks, kyivDateKey, startOfWeek, weekDays, weekRangeIso } from './week';

describe('studio week', () => {
  it('starts the week on Monday in Europe/Kyiv', () => {
    const thursday = new Date('2026-10-08T12:00:00.000Z');
    const start = startOfWeek(thursday);

    expect(kyivDateKey(start)).toBe('2026-10-05');
    expect(kyivDateKey(addWeeks(start, 1))).toBe('2026-10-12');
  });

  it('covers seven Kyiv dates and an exclusive end', () => {
    const start = startOfWeek(new Date('2026-10-08T12:00:00.000Z'));
    const days = weekDays(start);
    const range = weekRangeIso(start);

    expect(days.map((day) => kyivDateKey(day))).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(range.from).toBe(start.toISOString());
    expect(range.to).toBe(addWeeks(start, 1).toISOString());
  });
});
