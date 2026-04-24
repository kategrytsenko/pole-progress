import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthApi, type AuthSession, type AuthUser } from './auth-api';
import { ProfilesApi, type UserRole } from './profiles.api';

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
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

      if (user) {
        const role = await this.profiles.getMyRole();
        this.state.update((s) => ({ ...s, role }));
      }

      this.unsubscribe?.();
      this.unsubscribe = this.auth.onAuthStateChange(async (newSession) => {
        const newUser = newSession?.user ?? null;

        this.state.update((s) => ({
          ...s,
          session: newSession,
          user: newUser,
          role: null,
          error: null,
        }));

        if (newUser) {
          try {
            const role = await this.profiles.getMyRole();
            this.state.update((s) => ({ ...s, role }));
          } catch (err: unknown) {
            this.state.update((s) => ({
              ...s,
              error: toErrorMessage(err, 'Failed to load role'),
            }));
          }
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
    await this.auth.signOut();
  }
}
