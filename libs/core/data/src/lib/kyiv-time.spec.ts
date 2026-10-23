import {
  addMinutes,
  currentKyivWeekDates,
  KYIV_TIME_GAP_MESSAGE,
  kyivDateAndTime,
  kyivInclusiveDateRangeIso,
  kyivWallTimeToDate,
  KyivTimeError,
} from './kyiv-time';

describe('Europe/Kyiv wall time', () => {
  it('stores 18:00 as 15:00Z while summer time is still in effect', () => {
    const start = kyivWallTimeToDate('2026-10-23', '18:00');

    expect(start.toISOString()).toBe('2026-10-23T15:00:00.000Z');
    expect(kyivDateAndTime(start.toISOString())).toEqual({ date: '2026-10-23', time: '18:00' });
    expect(addMinutes(start, 60).toISOString()).toBe('2026-10-23T16:00:00.000Z');
  });

  it('stores 18:00 as 16:00Z after the autumn change', () => {
    expect(kyivWallTimeToDate('2026-10-25', '18:00').toISOString()).toBe('2026-10-25T16:00:00.000Z');
    expect(kyivWallTimeToDate('2026-10-26', '18:00').toISOString()).toBe('2026-10-26T16:00:00.000Z');
    expect(kyivWallTimeToDate('2026-11-02', '18:00').toISOString()).toBe('2026-11-02T16:00:00.000Z');
  });

  it('keeps a 60-minute class as 60 absolute minutes across the spring change', () => {
    const start = kyivWallTimeToDate('2026-03-29', '02:30');
    const end = addMinutes(start, 60);

    expect(start.toISOString()).toBe('2026-03-29T00:30:00.000Z');
    expect(end.toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(kyivDateAndTime(end.toISOString())).toEqual({ date: '2026-03-29', time: '04:30' });
  });

  it('rejects the hour skipped when the clock moves forward', () => {
    expect(() => kyivWallTimeToDate('2026-03-29', '03:30')).toThrow(KyivTimeError);
    expect(() => kyivWallTimeToDate('2026-03-29', '03:30')).toThrow(KYIV_TIME_GAP_MESSAGE);
    expect(kyivWallTimeToDate('2026-03-29', '04:00').toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });

  it('uses the first occurrence when the autumn change repeats an hour', () => {
    const first = kyivWallTimeToDate('2026-10-25', '03:30');

    expect(first.toISOString()).toBe('2026-10-25T00:30:00.000Z');
    expect(kyivDateAndTime(first.toISOString())).toEqual({ date: '2026-10-25', time: '03:30' });
    expect(kyivDateAndTime('2026-10-25T01:30:00.000Z')).toEqual({ date: '2026-10-25', time: '03:30' });
  });

  it('covers an inclusive Kyiv date, including the day of the autumn change', () => {
    expect(kyivInclusiveDateRangeIso('2026-10-25', '2026-10-25')).toEqual({
      from: '2026-10-24T21:00:00.000Z',
      to: '2026-10-25T22:00:00.000Z',
    });
    expect(currentKyivWeekDates(new Date('2026-10-23T09:00:00.000Z'))).toEqual({
      from: '2026-10-19',
      to: '2026-10-25',
    });
  });
});
