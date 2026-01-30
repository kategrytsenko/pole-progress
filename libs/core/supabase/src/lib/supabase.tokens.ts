import { InjectionToken } from '@angular/core';

export type SupabaseConfig = { url: string; anonKey: string };

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG');
