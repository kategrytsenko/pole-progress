export type NavEmphasis = 'primary' | 'optional' | 'admin';

export interface ShellNavItem {
  link: string;
  label: string;
  exact: boolean;
  emphasis: NavEmphasis;
  dividerBefore?: boolean;
}

/** Schedule and journals are visible without a pass. Diary, students, and admin are not. */
export function shellNavItems(input: { studioAccess: boolean; admin: boolean }): ShellNavItem[] {
  const items: ShellNavItem[] = [];
  if (input.studioAccess) {
    items.push({ link: '/app', label: 'Щоденник', exact: true, emphasis: 'primary' });
  }
  items.push({
    link: '/app/schedule',
    label: 'Розклад',
    exact: true,
    emphasis: 'optional',
    dividerBefore: input.studioAccess,
  });
  items.push({
    link: '/app/journals',
    label: 'Щоденники',
    exact: false,
    emphasis: 'optional',
  });
  if (input.admin) {
    items.push({
      link: '/app/students',
      label: 'Учні',
      exact: false,
      emphasis: 'admin',
      dividerBefore: true,
    });
    items.push({ link: '/admin', label: 'Адмін', exact: false, emphasis: 'admin' });
  }
  return items;
}
