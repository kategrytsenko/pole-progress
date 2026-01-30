import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { AuthStore } from '@org/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAppInitializer(async () => {
      const auth = inject(AuthStore);
      await auth.init();
    }),
  ],
};
