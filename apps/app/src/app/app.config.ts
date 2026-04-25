import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { provideAuth, AuthStore } from '@org/auth';
import { BrandingService } from '@org/data';
import { provideSupabase } from '@org/supabase';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import { PpTitleStrategy } from './title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: PpTitleStrategy },
    provideSupabase({
      url: environment.supabase.url,
      anonKey: environment.supabase.anonKey,
    }),
    provideAuth(),
    provideAppInitializer(async () => {
      const auth = inject(AuthStore);
      const branding = inject(BrandingService);
      await auth.init();
      await branding.load();
    }),
  ],
};
