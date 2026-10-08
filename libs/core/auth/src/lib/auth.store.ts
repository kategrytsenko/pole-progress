import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AuthApi,
  type AuthSession,
  type AuthUser,
  type EmailOtpType,
  type StudioOAuthProvider,
} from './auth-api';
import { toAuthError } from './auth-errors';
import { ProfilesApi, type UserRole } from './profiles.api';
import { resolveStudioAccess } from './studio-access';

export type StudioAccessState = 'pending' | 'allowed' | 'restricted' | 'error';

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  role: UserRole | null;
  studioAccess: StudioAccessState;
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

function toEmailOtpType(value: string | null): EmailOtpType {
  if (value && EMAIL_OTP_TYPES.includes(value as EmailOtpType)) {
    return value as EmailOtpType;
  }
  return 'magiclink';
}

function callbackUrl(): string {
  if (typeof window === 'undefined') return '/auth/callback';
  return `${window.location.origin}/auth/callback`;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthApi);
  private readonly profiles = inject(ProfilesApi);

  private readonly state = signal<AuthState>({
    session: null,
    user: null,
    role: null,
    studioAccess: 'pending',
    loading: true,
    error: null,
  });

  readonly session = computed<AuthSession | null>(() => this.state().session);
  readonly user = computed<AuthUser | null>(() => this.state().user);
  readonly role = computed<UserRole | null>(() => this.state().role);
  readonly studioAccess = computed<StudioAccessState>(() => this.state().studioAccess);
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly error = computed<string | null>(() => this.state().error);

  readonly isAuthed = computed<boolean>(() => this.user() !== null);
  readonly isAdmin = computed<boolean>(() => this.role() === 'admin');
  readonly isInstructor = computed<boolean>(() => this.profiles.isInstructor(this.role()));
  readonly isStaff = computed<boolean>(() => this.profiles.isStaff(this.role()));
  readonly hasStudioAccess = computed<boolean>(() => this.studioAccess() === 'allowed');
  readonly accessResolved = computed<boolean>(() => {
    if (this.loading()) return false;
    if (!this.user()) return true;
    return this.studioAccess() !== 'pending';
  });

  private unsubscribe: null | (() => void) = null;
  private initialized = false;
  private accessLoad: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const session = await this.auth.getSession();
      const user = session?.user ?? null;
      this.state.update((s) => ({
        ...s,
        session,
        user,
        studioAccess: 'pending',
      }));

      if (user) await this.loadAccess();

      this.unsubscribe?.();
      // Keep this callback synchronous. Supabase awaits subscribers while it
      // still holds the auth lock, so an awaited profile query deadlocks sign-in.
      this.unsubscribe = this.auth.onAuthStateChange((newSession) => {
        const newUser = newSession?.user ?? null;
        const sameUser = !!newUser && newUser.id === this.state().user?.id;

        this.state.update((s) => ({
          ...s,
          session: newSession,
          user: newUser,
          role: sameUser ? s.role : null,
          studioAccess: sameUser ? s.studioAccess : 'pending',
          error: sameUser ? s.error : null,
        }));

        if (newUser && !sameUser) {
          setTimeout(() => {
            void this.loadAccess();
          }, 0);
        }
      });

      this.state.update((s) => ({ ...s, loading: false }));
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toAuthError(err, 'Не вдалось відновити сесію'),
      }));
    }
  }

  /** Resolves role and membership. Safe to await from guards after bootstrap. */
  async ensureAccessResolved(): Promise<void> {
    await this.init();
    if (!this.state().user || this.state().studioAccess !== 'pending') return;
    await this.loadAccess();
  }

  async refreshStudioAccess(): Promise<void> {
    if (!this.state().user) return;
    this.state.update((s) => ({ ...s, studioAccess: 'pending', error: null }));
    await this.loadAccess();
  }

  clearError(): void {
    this.state.update((s) => ({ ...s, error: null }));
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

      await this.adoptSession();
    } catch (err: unknown) {
      const session = await this.auth.getSession().catch(() => null);
      if (session?.user) {
        await this.adoptSession();
        return;
      }
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toAuthError(err, 'Не вдалось завершити вхід'),
      }));
    }
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      await this.auth.signInWithPassword({ email, password });
      await this.adoptSession();
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toAuthError(err),
      }));
    }
  }

  /** Returns true when a session exists. False means the address still needs confirmation. */
  async signUpWithPassword(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<boolean> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const session = await this.auth.signUpWithPassword({
        email: input.email,
        password: input.password,
        name: input.name,
        emailRedirectTo: callbackUrl(),
      });
      if (!session) {
        this.state.update((s) => ({ ...s, loading: false }));
        return false;
      }
      await this.adoptSession();
      return true;
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toAuthError(err),
      }));
      return false;
    }
  }

  async signInWithOAuth(provider: StudioOAuthProvider): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      await this.auth.signInWithOAuth({ provider, redirectTo: callbackUrl() });
      this.state.update((s) => ({ ...s, loading: false }));
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toAuthError(err),
      }));
    }
  }

  async signInMagicLink(email: string): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      await this.auth.signInWithMagicLink({ email, redirectTo: callbackUrl() });
      this.state.update((s) => ({ ...s, loading: false }));
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toAuthError(err, 'Не вдалось надіслати посилання'),
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
        studioAccess: 'pending',
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toAuthError(err, 'Не вдалось вийти'),
      }));
      throw err;
    }
  }

  private async adoptSession(): Promise<void> {
    const session = await this.auth.getSession();
    const user = session?.user ?? null;
    this.state.update((s) => ({
      ...s,
      session,
      user,
      role: null,
      studioAccess: 'pending',
      error: user ? null : 'Сесія не створилась. Спробуй ще раз.',
    }));
    if (user) await this.loadAccess();
    this.state.update((s) => ({ ...s, loading: false }));
  }

  private loadAccess(): Promise<void> {
    if (this.accessLoad) return this.accessLoad;

    const gate: { current: Promise<void> | null } = { current: null };
    const run = this.fetchAccess().finally(() => {
      if (this.accessLoad === gate.current) this.accessLoad = null;
    });
    gate.current = run;
    this.accessLoad = run;
    return run;
  }

  private async fetchAccess(): Promise<void> {
    const userId = this.state().user?.id;
    if (!userId) return;

    const [roleResult, accessResult] = await Promise.allSettled([
      this.profiles.getMyRole(),
      this.profiles.hasStudioAccess(),
    ]);

    if (this.state().user?.id !== userId) return;

    const role = roleResult.status === 'fulfilled' ? roleResult.value : null;
    const accessOk = accessResult.status === 'fulfilled';
    const databaseAllows = accessOk ? accessResult.value : false;
    const staff = role === 'admin' || role === 'instructor';

    if (staff || accessOk) {
      this.state.update((s) =>
        s.user?.id === userId
          ? {
              ...s,
              role,
              studioAccess: resolveStudioAccess({ role, databaseAllows }),
              error: null,
            }
          : s,
      );
      return;
    }

    const reason = roleResult.status === 'rejected'
      ? roleResult.reason
      : accessResult.status === 'rejected'
        ? accessResult.reason
        : null;
    this.state.update((s) =>
      s.user?.id === userId
        ? {
            ...s,
            role,
            studioAccess: 'error',
            error: toAuthError(reason, 'Не вдалось перевірити доступ до студії'),
          }
        : s,
    );
  }
}
