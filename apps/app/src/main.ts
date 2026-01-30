import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { environment } from './environments/environment';
import { SUPABASE_CONFIG } from '@org/supabase';

bootstrapApplication(App, {
  providers: [
    { provide: SUPABASE_CONFIG, useValue: { url: environment.supabaseUrl, anonKey: environment.supabaseAnonKey } },
  ],
});
