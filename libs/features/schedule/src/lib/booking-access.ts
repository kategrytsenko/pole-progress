export interface SessionBookingInput {
  status: 'scheduled' | 'cancelled';
  startsAt: string;
  bookedCount: number;
  capacity: number;
  booked: boolean;
  hasPass: boolean;
  profileComplete: boolean;
  now: number;
}

export interface SessionBookingState {
  canBook: boolean;
  canCancel: boolean;
  hint: string | null;
  full: boolean;
}

/**
 * Book and cancel stay off until the profile has a name and phone.
 * A pass is still required to book. Profile completion does not create one.
 */
export function sessionBookingState(input: SessionBookingInput): SessionBookingState {
  const upcoming = Date.parse(input.startsAt) > input.now;
  const full = input.bookedCount >= input.capacity;
  const open = input.status === 'scheduled';
  const cancelled = input.status === 'cancelled';

  return {
    full,
    canBook: input.profileComplete && open && upcoming && !full && input.hasPass && !input.booked,
    canCancel: input.profileComplete && input.booked,
    hint: bookingHint({ ...input, upcoming, full, open, cancelled }),
  };
}

function bookingHint(
  input: SessionBookingInput & {
    upcoming: boolean;
    full: boolean;
    open: boolean;
    cancelled: boolean;
  },
): string | null {
  if (input.cancelled) return 'Заняття скасовано';
  if (!input.upcoming && !input.booked) return 'Заняття вже відбулося';
  if (!input.booked && input.full) return 'Немає місць';
  if (!input.profileComplete && input.booked) {
    return 'Щоб скасувати запис, вкажи ім’я та телефон у профілі.';
  }
  if (!input.booked && input.upcoming && !input.hasPass) return 'Немає активного абонемента';
  if (!input.profileComplete && input.open && input.upcoming && !input.full && input.hasPass) {
    return 'Щоб записатися, вкажи ім’я та телефон у профілі.';
  }
  return null;
}
