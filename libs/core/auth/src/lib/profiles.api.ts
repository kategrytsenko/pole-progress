import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';

export type UserRole = 'admin' | 'student';

@Injectable({ providedIn: 'root' })
export class ProfilesApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async getMyRole(): Promise<UserRole | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('role')
      .maybeSingle(); // поверне null якщо рядка нема

    if (error) throw error;
    return (data?.role as UserRole | undefined) ?? null;
  }
}
