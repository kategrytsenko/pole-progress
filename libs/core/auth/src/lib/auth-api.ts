import type { Session, User } from '@supabase/supabase-js';
import type { EmailOtpType } from './email-otp';

export type AuthUser = User;
export type AuthSession = Session;

export interface SignInPasswordInput {
  email: string;
  password: string;
}

export interface VerifyEmailOtpInput {
  tokenHash: string;
  type: EmailOtpType;
}

export interface SignUpPasswordInput {
  email: string;
  password: string;
  name?: string;
  emailRedirectTo?: string;
}

export interface SignUpPasswordResult {
  session: AuthSession | null;
  /** Null when Auth did not return a user. Zero means the address is already registered. */
  identitiesCount: number | null;
}

export interface ResetPasswordInput {
  email: string;
  redirectTo: string;
}

/** Google is the only OAuth provider this studio offers. */
export type StudioOAuthProvider = 'google';

export interface SignInOAuthInput {
  provider: StudioOAuthProvider;
  redirectTo: string;
}

export abstract class AuthApi {
  abstract getSession(): Promise<AuthSession | null>;
  abstract getUser(): Promise<AuthUser | null>;

  abstract signInWithPassword(input: SignInPasswordInput): Promise<AuthSession>;
  abstract signUpWithPassword(input: SignUpPasswordInput): Promise<SignUpPasswordResult>;
  abstract signInWithOAuth(input: SignInOAuthInput): Promise<void>;
  abstract signOut(): Promise<void>;

  abstract resetPasswordForEmail(input: ResetPasswordInput): Promise<void>;
  abstract updatePassword(password: string): Promise<void>;

  abstract verifyEmailOtp(input: VerifyEmailOtpInput): Promise<AuthSession>;
  abstract exchangeCodeForSession(code: string): Promise<AuthSession>;

  abstract onAuthStateChange(cb: (session: AuthSession | null) => void): () => void;
}
