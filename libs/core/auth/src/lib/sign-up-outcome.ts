export type SignUpOutcome = 'signed-in' | 'confirm-email' | 'already-registered';

/**
 * A session means the account is usable now.
 * An empty identities list is Supabase's enumeration-safe "this address already exists" response.
 * Any other session-less success still needs the confirmation mail.
 */
export function signUpOutcome(
  hasSession: boolean,
  identitiesCount: number | null,
): SignUpOutcome {
  if (hasSession) return 'signed-in';
  if (identitiesCount === 0) return 'already-registered';
  return 'confirm-email';
}
