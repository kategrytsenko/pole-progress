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
  name?: string;
  emailRedirectTo?: string;
}

/** Google is a Supabase provider. Instagram is not, so the client keeps it as a placeholder. */
export type StudioOAuthProvider = 'google' | 'instagram';

export interface SignInOAuthInput {
  provider: StudioOAuthProvider;
  redirectTo: string;
}

export abstract class AuthApi {
  abstract getSession(): Promise<AuthSession | null>;
  abstract getUser(): Promise<AuthUser | null>;


  abstract signInWithPassword(input: SignInPasswordInput): Promise<AuthSession>;
  abstract signUpWithPassword(input: SignUpPasswordInput): Promise<AuthSession | null>;
  abstract signInWithOAuth(input: SignInOAuthInput): Promise<void>;
  abstract signOut(): Promise<void>;

  abstract signInWithMagicLink(input: SignInMagicLinkInput): Promise<void>;
  abstract verifyEmailOtp(input: VerifyEmailOtpInput): Promise<AuthSession>;
  abstract exchangeCodeForSession(code: string): Promise<AuthSession>;

  // stream змін сесії
  abstract onAuthStateChange(cb: (session: AuthSession | null) => void): () => void;
}
