import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { ClientPass, PassProduct } from './models';

const PRODUCT_COLUMNS = 'id, name, class_count, validity_days, active, created_at';
const PASS_COLUMNS =
  'id, user_id, product_id, remaining, valid_from, valid_until, status, created_at';

@Injectable({ providedIn: 'root' })
export class PassesApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async listProducts(): Promise<PassProduct[]> {
    const { data, error } = await this.client
      .from('pass_products')
      .select(PRODUCT_COLUMNS)
      .order('name', { ascending: true })
      .returns<PassProduct[]>();

    if (error) throw error;
    return data ?? [];
  }

  /** Passes the signed-in client can spend right now. */
  async listMine(): Promise<ClientPass[]> {
    const uid = await this.requireUid();
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from('client_passes')
      .select(PASS_COLUMNS)
      .eq('user_id', uid)
      .eq('status', 'active')
      .gt('remaining', 0)
      .lte('valid_from', now)
      .gte('valid_until', now)
      .order('valid_until', { ascending: true })
      .order('created_at', { ascending: true })
      .returns<ClientPass[]>();

    if (error) throw error;
    return data ?? [];
  }

  async getPass(id: string): Promise<ClientPass | null> {
    const { data, error } = await this.client
      .from('client_passes')
      .select(PASS_COLUMNS)
      .eq('id', id)
      .maybeSingle<ClientPass>();

    if (error) throw error;
    return data ?? null;
  }

  private async requireUid(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }
}
