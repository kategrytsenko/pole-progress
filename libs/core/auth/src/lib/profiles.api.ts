import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';

export type UserRole = 'admin' | 'instructor' | 'student';

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
    const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
    if (sessionError) throw sessionError;

    const userId = sessionData.session?.user.id;
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
}
