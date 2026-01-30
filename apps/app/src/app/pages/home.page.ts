import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@org/auth';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="p-6">
      <h1 class="text-xl font-semibold">Pole Progress</h1>

      @if (auth.isAdmin()) {
        <a class="underline" routerLink="/admin">Go to admin</a>
      } @else {
        <p class="mt-2">Student mode</p>
      }
    </main>
  `,
})
export class HomePage {
  readonly auth = inject(AuthStore);
}
