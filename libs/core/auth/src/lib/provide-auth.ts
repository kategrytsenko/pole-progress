import { makeEnvironmentProviders } from '@angular/core';
import { AuthApi } from './auth-api';
import { SupabaseAuthApi } from './supabase-auth.api';

export function provideAuth() {
  return makeEnvironmentProviders([
    { provide: AuthApi, useExisting: SupabaseAuthApi },
  ]);
}
