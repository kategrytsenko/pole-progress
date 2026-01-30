import { InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseConfig = { url: string; anonKey: string };

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG');
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT');
