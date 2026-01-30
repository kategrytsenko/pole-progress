import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcome } from './nx-welcome';
import { SupabaseClientService } from '@org/supabase';


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
  
  ngOnInit() {
  this.sb.client.auth.getSession().then(console.log);

  }


}
