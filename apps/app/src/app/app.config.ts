import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAuth, AuthStore } from '@org/auth';
import { provideSupabase } from '@org/supabase';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideSupabase({
      url: environment.supabase.url,
      anonKey: environment.supabase.anonKey,
    }),
    provideAuth(),
    provideAppInitializer(async () => {
      const auth = inject(AuthStore);
      await auth.init();
    }),
  ],
};
