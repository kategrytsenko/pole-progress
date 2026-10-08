import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AuthApi,
  type AuthSession,
  type AuthUser,
  type SignInMagicLinkInput,
  type SignInOAuthInput,
  type SignInPasswordInput,
  type SignUpPasswordInput,
  type VerifyEmailOtpInput,
} from './auth-api';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthApi extends AuthApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  }

  async getUser(): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  }

  async signInWithPassword(input: SignInPasswordInput): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword(input);
    if (error) throw error;
    if (!data.session) throw new Error('No session returned from signInWithPassword');
    return data.session;
  }

  async signUpWithPassword(input: SignUpPasswordInput): Promise<AuthSession | null> {
    const name = input.name?.trim();
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: name ? { name } : undefined,
        emailRedirectTo: input.emailRedirectTo,
      },
    });
    if (error) throw error;
    return data.session ?? null;
  }

  async signInWithOAuth({ provider, redirectTo }: SignInOAuthInput): Promise<void> {
    // GoTrue has no Instagram provider. Keep the button, and fail with a mapped message.
    if (provider === 'instagram') {
      throw new Error('Unsupported provider: instagram is not enabled');
    }

    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async signInWithMagicLink({ email, redirectTo }: SignInMagicLinkInput): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (error) throw error;
  }

  async verifyEmailOtp({ tokenHash, type }: VerifyEmailOtpInput): Promise<AuthSession> {
    const { data, error } = await this.client.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) throw error;
    if (!data.session) throw new Error('No session returned from verifyOtp');
    return data.session;
  }

  async exchangeCodeForSession(code: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session) throw new Error('No session returned from exchangeCodeForSession');
    return data.session;
  }

  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => cb(session ?? null));
    return () => data.subscription.unsubscribe();
  }
}
