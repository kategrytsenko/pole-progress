import { currentClientPass } from './membership';
import type { ClientPass } from './models';

function pass(partial: Pick<ClientPass, 'id' | 'status' | 'valid_from' | 'valid_until'> & Partial<ClientPass>): ClientPass {
  return {
    user_id: 'user-1',
    product_id: 'product-1',
    remaining: 4,
    created_at: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

const now = new Date('2026-10-09T12:00:00.000Z');

describe('currentClientPass', () => {
  it('returns the active pass that covers the current time', () => {
    const active = pass({
      id: 'active',
      status: 'active',
      valid_from: '2026-10-01T00:00:00.000Z',
      valid_until: '2026-10-31T00:00:00.000Z',
    });

    expect(currentClientPass([active], now)).toEqual(active);
  });

  it('ignores passes that are not active or are outside their dates', () => {
    const passes = [
      pass({
        id: 'expired-status',
        status: 'expired',
        valid_from: '2026-10-01T00:00:00.000Z',
        valid_until: '2026-10-31T00:00:00.000Z',
      }),
      pass({
        id: 'not-yet',
        status: 'active',
        valid_from: '2026-11-01T00:00:00.000Z',
        valid_until: '2026-11-30T00:00:00.000Z',
      }),
      pass({
        id: 'lapsed',
        status: 'active',
        valid_from: '2026-09-01T00:00:00.000Z',
        valid_until: '2026-10-01T00:00:00.000Z',
      }),
    ];

    expect(currentClientPass(passes, now)).toBeNull();
  });

  it('keeps the active pass that ends latest', () => {
    const sooner = pass({
      id: 'sooner',
      status: 'active',
      valid_from: '2026-10-01T00:00:00.000Z',
      valid_until: '2026-10-20T00:00:00.000Z',
    });
    const later = pass({
      id: 'later',
      status: 'active',
      valid_from: '2026-10-01T00:00:00.000Z',
      valid_until: '2026-12-01T00:00:00.000Z',
    });

    expect(currentClientPass([sooner, later], now)?.id).toBe('later');
  });
});
