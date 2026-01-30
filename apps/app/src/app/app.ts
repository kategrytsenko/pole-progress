import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcome } from './nx-welcome';
import { SupabaseClientService } from '@org/supabase';
import { AuthApi } from '@org/auth';


@Component({
  imports: [NxWelcome, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [SupabaseClientService],
})
export class App implements OnInit {
  protected title = 'app';
  private sb = inject(SupabaseClientService);
  private auth = inject(AuthApi);
  
  async ngOnInit() {
    this.sb.client.auth.getSession().then(console.log);

    await this.auth.signInWithPassword({ email: "grytsenko.kate.ua@gmail.com", password: "Ej77Mzfr7mvUDa4" });
    console.log(await this.auth.getUser());
  }


}
