import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthApi, type AuthSession, type AuthUser } from './auth-api';
import { ProfilesApi, type UserRole } from './profiles.api';

type AuthState = {
  session: AuthSession | null;
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
};

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

  // selectors

  readonly session = computed<AuthSession | null>(() => this.state().session);
  readonly user = computed<AuthUser | null>(() => this.state().user);
  readonly role = computed<UserRole | null>(() => this.state().role);
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly error = computed<string | null>(() => this.state().error);

  readonly isAuthed = computed<boolean>(() => this.user() !== null);
  readonly isAdmin = computed<boolean>(() => this.role() === 'admin');

  private unsubscribe: null | (() => void) = null;

  async init(): Promise<void> {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    try {
      const session = await this.auth.getSession();
      const user = session?.user ?? null;

      this.state.update(s => ({ ...s, session, user }));

      if (user) {
        const role = await this.profiles.getMyRole();
        this.state.update(s => ({ ...s, role }));
      } else {
        this.state.update(s => ({ ...s, role: null }));
      }

      this.unsubscribe?.();
      this.unsubscribe = this.auth.onAuthStateChange(async (newSession) => {
        const newUser = newSession?.user ?? null;

        this.state.update(s => ({
          ...s,
          session: newSession,
          user: newUser,
          role: null,
          error: null,
        }));

        if (newUser) {
          try {
            const role = await this.profiles.getMyRole();
            this.state.update(s => ({ ...s, role }));
          } catch (e: any) {
            this.state.update(s => ({ ...s, error: e?.message ?? 'Failed to load role' }));
          }
        }
      });

      this.state.update(s => ({ ...s, loading: false }));
    } catch (e: any) {
      this.state.update(s => ({
        ...s,
        loading: false,
        error: e?.message ?? 'Auth init failed',
      }));
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    // onAuthStateChange сам все скине
  }
}
