import type { Session, User } from '@supabase/supabase-js';

export type AuthUser = User;
export type AuthSession = Session;

export interface SignInPasswordInput {
  email: string;
  password: string;
}

export type SignInMagicLinkInput = {
  email: string;
  redirectTo?: string;
};

export type EmailOtpType =
  | 'magiclink'
  | 'email'
  | 'signup'
  | 'invite'
  | 'recovery'
  | 'email_change';

export interface VerifyEmailOtpInput {
  tokenHash: string;
  type: EmailOtpType;
}

export interface SignUpPasswordInput {
  email: string;
  password: string;
  // на майбутнє: user_metadata?: Record<string, unknown>
}

export abstract class AuthApi {
  abstract getSession(): Promise<AuthSession | null>;
  abstract getUser(): Promise<AuthUser | null>;


  abstract signInWithPassword(input: SignInPasswordInput): Promise<AuthSession>;
  abstract signUpWithPassword(input: SignUpPasswordInput): Promise<AuthSession | null>; // supabase може повернути null session якщо треба підтвердження email
  abstract signOut(): Promise<void>;

  abstract signInWithMagicLink(input: SignInMagicLinkInput): Promise<void>;
  abstract verifyEmailOtp(input: VerifyEmailOtpInput): Promise<AuthSession>;
  abstract exchangeCodeForSession(code: string): Promise<AuthSession>;

  // stream змін сесії
  abstract onAuthStateChange(cb: (session: AuthSession | null) => void): () => void;
}
