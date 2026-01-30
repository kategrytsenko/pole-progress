import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { environment } from './environments/environment';
import { provideSupabase } from '@org/supabase';
import { provideAuth } from '@org/auth';

bootstrapApplication(App, {
  providers: [
    provideSupabase({
      url: environment.supabase.url,
      anonKey: environment.supabase.anonKey,
    }),
    provideAuth(),
  ],
});
