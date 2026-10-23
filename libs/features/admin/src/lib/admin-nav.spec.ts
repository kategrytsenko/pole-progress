import { ADMIN_NAV } from './admin-nav';
import { adminRoutes } from './admin.routes';

describe('admin sessions navigation', () => {
  it('links Заняття to /admin/sessions', () => {
    expect(ADMIN_NAV).toContainEqual({ path: 'sessions', label: 'Заняття' });

    const children = adminRoutes[0]?.children ?? [];
    const sessions = children.find((route) => route.path === 'sessions');
    expect(sessions?.title).toBe('Заняття — Адмін');
  });
});
