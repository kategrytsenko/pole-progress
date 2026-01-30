import { inject, Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase.tokens';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private readonly cfg = inject(SUPABASE_CONFIG);

  readonly client: SupabaseClient = createClient(this.cfg.url, this.cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
