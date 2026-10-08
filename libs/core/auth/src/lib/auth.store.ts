import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AuthApi,
  type AuthSession,
  type AuthUser,
  type EmailOtpType,
} from './auth-api';
import { ProfilesApi, type UserRole } from './profiles.api';

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'magiclink',
  'email',
  'signup',
  'invite',
  'recovery',
  'email_change',
];

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

function toMagicLinkError(err: unknown): string {
  const message = toErrorMessage(err, 'Не вдалось завершити вхід');
  const normalized = message.toLowerCase();
  if (normalized.includes('code verifier')) {
    return 'Посилання відкрито в іншому браузері. Запроси нове і відкрий його в цьому ж вікні.';
  }
  if (normalized.includes('expired') || normalized.includes('invalid') || normalized.includes('otp')) {
    return 'Посилання недійсне або застаріло. Запроси нове.';
  }
  return message;
}

function toEmailOtpType(value: string | null): EmailOtpType {
  if (value && EMAIL_OTP_TYPES.includes(value as EmailOtpType)) {
    return value as EmailOtpType;
  }
  return 'magiclink';
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthApi);
  private readonly profiles = inject(ProfilesApi);

  private readonly state = signal<AuthState>({
    session: null,
    user: null,
    role: null,
    loading: true,
    error: null,
  });

  readonly session = computed<AuthSession | null>(() => this.state().session);
  readonly user = computed<AuthUser | null>(() => this.state().user);
  readonly role = computed<UserRole | null>(() => this.state().role);
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly error = computed<string | null>(() => this.state().error);

  readonly isAuthed = computed<boolean>(() => this.user() !== null);
  readonly isAdmin = computed<boolean>(() => this.role() === 'admin');
  readonly isInstructor = computed<boolean>(() => this.profiles.isInstructor(this.role()));
  readonly isStaff = computed<boolean>(() => this.profiles.isStaff(this.role()));

  private unsubscribe: null | (() => void) = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const session = await this.auth.getSession();
      const user = session?.user ?? null;
      this.state.update((s) => ({ ...s, session, user }));

      if (user) await this.loadRole();

      this.unsubscribe?.();
      // Keep this callback synchronous. Supabase awaits subscribers while it
      // still holds the auth lock, so an awaited profile query deadlocks sign-in.
      this.unsubscribe = this.auth.onAuthStateChange((newSession) => {
        const newUser = newSession?.user ?? null;

        this.state.update((s) => ({
          ...s,
          session: newSession,
          user: newUser,
          role: null,
          error: null,
        }));

        if (newUser) {
          setTimeout(() => {
            void this.loadRole();
          }, 0);
        }
      });

      this.state.update((s) => ({ ...s, loading: false }));
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toErrorMessage(err, 'Auth init failed'),
      }));
    }
  }

  async completeMagicLink(input: {
    code: string | null;
    tokenHash: string | null;
    otpType: string | null;
  }): Promise<void> {
    if (this.state().session) return;
    if (!input.tokenHash && !input.code) return;

    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      if (input.tokenHash) {
        await this.auth.verifyEmailOtp({
          tokenHash: input.tokenHash,
          type: toEmailOtpType(input.otpType),
        });
      } else if (input.code) {
        await this.auth.exchangeCodeForSession(input.code);
      }

      const session = await this.auth.getSession();
      const user = session?.user ?? null;
      this.state.update((s) => ({
        ...s,
        session,
        user,
        loading: false,
        error: user ? s.error : 'Сесія не створилась. Запроси нове посилання.',
      }));
      if (user) await this.loadRole();
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toMagicLinkError(err),
      }));
    }
  }

  async signInMagicLink(email: string, redirectTo?: string): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      await this.auth.signInWithMagicLink({ email, redirectTo });
      this.state.update((s) => ({ ...s, loading: false }));
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toErrorMessage(err, 'Sign-in failed'),
      }));
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      this.state.set({
        session: null,
        user: null,
        role: null,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toErrorMessage(err, 'Sign-out failed'),
      }));
      throw err;
    }
  }

  private async loadRole(): Promise<void> {
    try {
      const role = await this.profiles.getMyRole();
      this.state.update((s) => (s.user ? { ...s, role } : s));
    } catch (err: unknown) {
      this.state.update((s) =>
        s.user ? { ...s, error: toErrorMessage(err, 'Failed to load role') } : s,
      );
    }
  }
}
