import { Component, inject, OnInit } from '@angular/core';
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
  private sb = inject(SupabaseClientService);
  readonly auth = inject(AuthStore);

  async onSignOut(): Promise<void> {
    await this.auth.signOut();
  }
  
  async ngOnInit() {
    this.auth.init();
    // this.sb.client.auth.getSession().then(console.log);
  }


}
