export interface AccessBenefitCopy {
  title: string | null;
  now: string;
  profile: string | null;
  pass: string;
}

const NOW = 'Зараз можна дивитися розклад і публічні щоденники інших клієнтів.';

const PROFILE_SAVED =
  'Після збереження імені й телефону студія зможе впізнати вас. Заповнений профіль сам по собі не дає абонемент.';

const WITH_PASS =
  'З абонементом з’являється власний щоденник — спроби, фото й відео — і запис на заняття. Абонемент оформлює студія, не цей застосунок.';

const PASS_ALREADY =
  'Доступ до студії вже є. Після збереження профілю можна вести свій щоденник і записуватися на заняття.';

const BLOCKED_ACTION =
  'Ця дія недоступна, доки профіль не заповнений. У профілі мають бути ім’я та номер телефону.';

/**
 * One contrast for the profile page and the membership screen.
 * Null when both gates are already open, so those pages do not repeat it.
 * A completed profile is not an абонемент, and the app does not sell one.
 */
export function accessBenefitCopy(input: {
  profileComplete: boolean;
  hasStudioAccess: boolean;
  redirected: boolean;
}): AccessBenefitCopy | null {
  if (input.profileComplete && input.hasStudioAccess) return null;

  return {
    title: input.redirected && !input.profileComplete ? BLOCKED_ACTION : null,
    now: NOW,
    profile: input.profileComplete ? null : PROFILE_SAVED,
    pass: input.hasStudioAccess ? PASS_ALREADY : WITH_PASS,
  };
}
