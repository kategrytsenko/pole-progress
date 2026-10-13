import type { StudioAccessState } from './auth.store';

/** Shown when a restricted action needs a name and phone before it can continue. */
export const PROFILE_NAME_PHONE_REQUIREMENT =
  'У профілі мають бути ім’я та номер телефону.';

export type AppAccessDecision = 'allow' | 'sign-in' | 'profile' | 'membership';

export interface DiaryAccessInput {
  authed: boolean;
  admin: boolean;
  profileComplete: boolean;
  studioAccess: StudioAccessState;
}

/**
 * Diary home and element routes. An incomplete profile goes to /app/profile
 * before the membership screen, so the return path can continue after save.
 * Admins keep their current access and are not sent there for an incomplete profile.
 */
export function diaryAccessDecision(input: DiaryAccessInput): AppAccessDecision {
  if (!input.authed) return 'sign-in';
  if (input.studioAccess === 'error') return 'membership';
  if (input.admin) return input.studioAccess === 'allowed' ? 'allow' : 'membership';
  if (!input.profileComplete) return 'profile';
  if (input.studioAccess !== 'allowed') return 'membership';
  return 'allow';
}

/** Schedule and public journals are open to any signed-in user. */
export function browseAccessDecision(authed: boolean): AppAccessDecision {
  return authed ? 'allow' : 'sign-in';
}
