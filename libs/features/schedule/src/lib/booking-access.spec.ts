import { sessionBookingState } from './booking-access';

const future = '2026-10-20T16:00:00.000Z';
const now = Date.parse('2026-10-13T12:00:00.000Z');

function state(overrides: Partial<Parameters<typeof sessionBookingState>[0]> = {}) {
  return sessionBookingState({
    status: 'scheduled',
    startsAt: future,
    bookedCount: 2,
    capacity: 8,
    booked: false,
    hasPass: true,
    profileComplete: true,
    now,
    ...overrides,
  });
}

describe('schedule booking controls', () => {
  it('offers booking to a complete profile with a pass and shows remaining seats via capacity', () => {
    const booking = state();
    expect(booking.canBook).toBe(true);
    expect(booking.canCancel).toBe(false);
    expect(booking.hint).toBeNull();
    expect(booking.full).toBe(false);
  });

  it('hides book and cancel until the profile has a name and phone', () => {
    expect(state({ profileComplete: false }).canBook).toBe(false);
    expect(state({ profileComplete: false }).hint).toBe(
      'Щоб записатися, вкажи ім’я та телефон у профілі.',
    );
    expect(state({ profileComplete: false, booked: true }).canCancel).toBe(false);
    expect(state({ profileComplete: false, booked: true }).hint).toBe(
      'Щоб скасувати запис, вкажи ім’я та телефон у профілі.',
    );
  });

  it('still refuses a complete profile that has no pass', () => {
    const booking = state({ hasPass: false });
    expect(booking.canBook).toBe(false);
    expect(booking.hint).toBe('Немає активного абонемента');
  });

  it('keeps a full class distinct from a cancelled one', () => {
    expect(state({ bookedCount: 8, capacity: 8 }).canBook).toBe(false);
    expect(state({ bookedCount: 8, capacity: 8 }).hint).toBe('Немає місць');
    expect(state({ status: 'cancelled' }).hint).toBe('Заняття скасовано');
    expect(state({ status: 'cancelled' }).canBook).toBe(false);
  });
});
