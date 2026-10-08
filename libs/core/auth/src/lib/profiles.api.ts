import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';

export type UserRole = 'admin' | 'instructor' | 'student';

export interface StudioProfile {
  id: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

interface ProfileEmailRow {
  id: string;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfilesApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  isInstructor(role: UserRole | null): boolean {
    return role === 'instructor';
  }

  isStaff(role: UserRole | null): boolean {
    return role === 'admin' || role === 'instructor';
  }

  async getMyRole(): Promise<UserRole | null> {
    const userId = await this.currentUserId();
    if (!userId) return null;

    // Staff can select every profile, so the query must be scoped to this user.
    const { data, error } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data?.role as UserRole | undefined) ?? null;
  }

  /** Staff can read every profile. A client receives only their own row. */
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
   * Staff bypass lives in `resolveStudioAccess`, not in the fallback query.
   */
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
