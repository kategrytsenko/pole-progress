import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SupabaseClientService } from '@org/supabase';
import { AuthStore } from '@org/auth';


@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [SupabaseClientService],
})
export class App implements OnInit {
  protected title = 'app';
  readonly auth = inject(AuthStore);  
  email = signal('');

  constructor() {
    void this.auth.init();
  }
    
  async onSendLink() {
    const email = this.email().trim();
    if (!email) return;
    await this.auth.signInMagicLink(email);
  }

  async onSignOut(): Promise<void> {
    await this.auth.signOut();
  }
  
  async ngOnInit() {
    this.auth.init();
  }


}
