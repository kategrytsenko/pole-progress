import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthApi, type SignInPasswordInput, type SignUpPasswordInput, type AuthSession, type AuthUser } from './auth-api';

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
    const { data, error } = await this.client.auth.signUp(input);
    if (error) throw error;
    return data.session ?? null;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => cb(session ?? null));
    return () => data.subscription.unsubscribe();
  }
}
