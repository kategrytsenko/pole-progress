import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { AppSettings, UpdateAppSettingsInput } from './models';

const SETTINGS_COLUMNS =
  'id, studio_name, logo_url, primary_color, default_capacity, cancel_cutoff_hours, created_at';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async getAppSettings(): Promise<AppSettings | null> {
    const { data, error } = await this.client
      .from('app_settings')
      .select(SETTINGS_COLUMNS)
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
      .select(SETTINGS_COLUMNS)
      .single<AppSettings>();

    if (error) throw error;
    return data;
  }
}
