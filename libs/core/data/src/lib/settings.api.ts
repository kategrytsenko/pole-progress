import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { AppSettings, UpdateAppSettingsInput } from './models';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async getAppSettings(): Promise<AppSettings | null> {
    const { data, error } = await this.client
      .from('app_settings')
      .select('id, studio_name, logo_url, primary_color, created_at')
      .eq('id', 1)
      .maybeSingle<AppSettings>();

    if (error) throw error;
    return data ?? null;
  }

  async updateAppSettings(input: UpdateAppSettingsInput): Promise<AppSettings> {
    const { data, error } = await this.client
      .from('app_settings')
      .update(input)
      .eq('id', 1)
      .select('id, studio_name, logo_url, primary_color, created_at')
      .single<AppSettings>();

    if (error) throw error;
    return data;
  }
}
