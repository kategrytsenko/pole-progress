export interface AdminNavItem {
  readonly path: string;
  readonly label: string;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { path: 'categories', label: 'Категорії' },
  { path: 'elements', label: 'Елементи' },
  { path: 'branding', label: 'Брендинг' },
  { path: 'sessions', label: 'Заняття' },
  { path: 'clients', label: 'Клієнти' },
];
