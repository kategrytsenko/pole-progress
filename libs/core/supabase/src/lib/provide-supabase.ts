import { makeEnvironmentProviders } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT, SUPABASE_CONFIG, type SupabaseConfig } from './supabase.tokens';

export function provideSupabase(config: SupabaseConfig) {
  return makeEnvironmentProviders([
    { provide: SUPABASE_CONFIG, useValue: config },
    {
      provide: SUPABASE_CLIENT,
      useFactory: (): SupabaseClient =>
        createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
        }),
    },
  ]);
}
