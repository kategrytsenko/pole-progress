export const EMAIL_OTP_TYPES = ['email', 'signup', 'invite', 'recovery', 'email_change'] as const;

export type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

/** Magic-link types are rejected. An unknown type is not treated as a magic link. */
export function toEmailOtpType(value: string | null): EmailOtpType | null {
  if (!value || value === 'magiclink') return null;
  return (EMAIL_OTP_TYPES as readonly string[]).includes(value) ? (value as EmailOtpType) : null;
}
