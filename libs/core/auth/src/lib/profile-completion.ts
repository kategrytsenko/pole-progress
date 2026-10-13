export const PROFILE_NAME_MAX_LENGTH = 80;
export const PROFILE_PHONE_MAX_LENGTH = 40;

export interface ProfileContactIssues {
  name: string | null;
  phone: string | null;
}

export interface OwnProfileUpdate {
  name: string;
  phone: string;
}

/**
 * Same rule as public.profile_is_complete(): both values are non-empty after
 * trimming whitespace. Null and a missing phone stay incomplete.
 */
export function isProfileComplete(
  name: string | null | undefined,
  phone: string | null | undefined,
): boolean {
  const issues = profileContactIssues(name ?? '', phone ?? '');
  return issues.name === null && issues.phone === null;
}

export function profileContactIssues(name: string, phone: string): ProfileContactIssues {
  return {
    name: contactIssue(
      name,
      PROFILE_NAME_MAX_LENGTH,
      'Вкажи ім’я.',
      'Ім’я має бути не довшим за 80 символів.',
    ),
    phone: contactIssue(
      phone,
      PROFILE_PHONE_MAX_LENGTH,
      'Вкажи номер телефону.',
      'Номер телефону має бути не довшим за 40 символів.',
    ),
  };
}

/**
 * Payload for the signed-in user's own profile row. Role is refused here.
 * Postgres still rejects a role change on profiles_update_admin_or_own.
 */
export function ownProfileUpdate(input: {
  name: string;
  phone: string;
  role?: unknown;
}): OwnProfileUpdate {
  if (Object.prototype.hasOwnProperty.call(input, 'role')) {
    throw new Error('Неможливо змінити роль.');
  }

  const issues = profileContactIssues(input.name, input.phone);
  if (issues.name || issues.phone) {
    throw new Error(issues.name ?? issues.phone ?? 'Профіль неповний');
  }

  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
  };
}

function contactIssue(
  value: string,
  maxLength: number,
  emptyMessage: string,
  longMessage: string,
): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return emptyMessage;
  if (trimmed.length > maxLength) return longMessage;
  return null;
}
