import { shellNavItems } from './shell-nav';

describe('shell navigation', () => {
  it('shows the schedule and journals to a signed-in client without a pass', () => {
    expect(shellNavItems({ studioAccess: false, admin: false }).map((item) => item.link)).toEqual([
      '/app/schedule',
      '/app/journals',
    ]);
  });

  it('adds the diary when studio access is present, and admin links only for an admin', () => {
    expect(shellNavItems({ studioAccess: true, admin: false }).map((item) => item.link)).toEqual([
      '/app',
      '/app/schedule',
      '/app/journals',
    ]);
    expect(shellNavItems({ studioAccess: true, admin: true }).map((item) => item.label)).toEqual([
      'Щоденник',
      'Розклад',
      'Щоденники',
      'Учні',
      'Адмін',
    ]);
  });
});
