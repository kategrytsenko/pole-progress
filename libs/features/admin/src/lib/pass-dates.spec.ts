import { addInputDays, inputDateEndIso, inputDateStartIso, todayInputDate } from './pass-dates';

describe('pass dates', () => {
  it('formats a local calendar day', () => {
    expect(todayInputDate(new Date(2026, 9, 9, 23, 30))).toBe('2026-10-09');
  });

  it('rolls a date across a month boundary', () => {
    expect(addInputDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addInputDays('2026-10-09', 30)).toBe('2026-11-08');
  });

  it('keeps the end of a day after its start', () => {
    const start = Date.parse(inputDateStartIso('2026-10-09'));
    const end = Date.parse(inputDateEndIso('2026-10-09'));
    expect(end).toBeGreaterThan(start);
  });
});
