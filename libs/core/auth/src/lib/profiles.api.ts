import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import { ownProfileUpdate, type OwnProfileUpdate } from './profile-completion';

export type UserRole = 'admin' | 'student';

export interface StudioProfile {
  id: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export interface OwnProfile extends StudioProfile {
  phone: string | null;
}

interface ProfileEmailRow {
  id: string;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfilesApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async getMyProfile(): Promise<OwnProfile | null> {
    const userId = await this.currentUserId();
    if (!userId) return null;

    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, role, created_at')
      .eq('id', userId)
      .maybeSingle<StudioProfile>();

    if (error) throw error;
    if (!data) return null;
    return { ...data, phone: await this.ownPhone() };
  }

  /**
   * Updates the signed-in user's name and phone. The payload has no role.
   * Phone is read back through own_profile_phone() because that column is
   * not selectable on the table.
   */
  async updateMyProfile(name: string, phone: string): Promise<OwnProfileUpdate> {
    const userId = await this.currentUserId();
    if (!userId) throw new Error('Немає сесії');

    const patch = ownProfileUpdate({ name, phone });
    const { data, error } = await this.client
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('name')
      .single<{ name: string | null }>();

    if (error) throw error;
    const savedName = data?.name ?? '';
    if (savedName !== patch.name) throw new Error('Не вдалося зберегти профіль');

    const savedPhone = await this.ownPhone();
    if (savedPhone !== patch.phone) throw new Error('Не вдалося зберегти профіль');
    return { name: savedName, phone: savedPhone };
  }

  async getMyRole(): Promise<UserRole | null> {
    const userId = await this.currentUserId();
    if (!userId) return null;

    // An admin can select every profile, so the query must be scoped to this user.
    const { data, error } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data?.role as UserRole | undefined) ?? null;
  }

  /** An admin can read every profile. A client receives only their own row. */
  async listProfiles(): Promise<StudioProfile[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, role, created_at')
      .order('name', { ascending: true, nullsFirst: false })
      .returns<StudioProfile[]>();

    if (error) throw error;
    return data ?? [];
  }

  /** Admin-only. RLS rejects the update for everyone else, including self-promotion. */
  async updateRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select('id')
      .single();

    if (error) throw error;
  }

  /**
   * Emails for the admin client list. A missing function (migration not applied)
   * yields an empty map so the page can still show profile ids.
   */
  async listProfileEmails(): Promise<ReadonlyMap<string, string>> {
    const { data, error } = await this.client.rpc('admin_profile_emails');
    if (error) {
      if (isMissingRpc(error, 'admin_profile_emails')) return new Map();
      throw error;
    }

    const emails = new Map<string, string>();
    for (const row of (data ?? []) as ProfileEmailRow[]) {
      const email = row.email?.trim();
      if (row.id && email) emails.set(row.id, email);
    }
    return emails;
  }

  /**
   * Database membership check. Prefers `has_studio_access()` and, if that
   * function is not migrated yet, falls back to an active `client_passes` row.
   * The admin bypass lives in `resolveStudioAccess`, not in the fallback query.
   */
  /** Database completion check. A missing or failed read stays incomplete. */
  async isProfileComplete(): Promise<boolean> {
    const { data, error } = await this.client.rpc('profile_is_complete');
    if (error) throw error;
    return data === true;
  }

  async hasStudioAccess(): Promise<boolean> {
    const { data, error } = await this.client.rpc('has_studio_access');
    if (!error) return isTrue(data);
    if (isMissingRpc(error, 'has_studio_access')) return this.hasActiveMembership();
    throw error;
  }

  async hasActiveMembership(now: Date = new Date()): Promise<boolean> {
    const userId = await this.currentUserId();
    if (!userId) return false;

    const iso = now.toISOString();
    const { data, error } = await this.client
      .from('client_passes')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('valid_from', iso)
      .gte('valid_until', iso)
      .limit(1);

    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  private async currentUserId(): Promise<string | null> {
    const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
    if (sessionError) throw sessionError;
    return sessionData.session?.user.id ?? null;
  }

  private async ownPhone(): Promise<string | null> {
    const { data, error } = await this.client.rpc('own_profile_phone');
    if (error) throw error;
    return typeof data === 'string' ? data : null;
  }
}

function isTrue(value: unknown): boolean {
  return value === true;
}

function isMissingRpc(error: unknown, functionName: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const normalized = message.toLowerCase();
  return code === 'PGRST202' || code === '42883' || normalized.includes(functionName.toLowerCase());
}
