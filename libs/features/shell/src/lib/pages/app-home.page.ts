import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@org/auth';

@Component({
  selector: 'pp-app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Привіт, {{ auth.user()?.email }}!</h1>
        <p class="mt-1 text-sm text-neutral-600">
          Тут зʼявиться твій каталог елементів і прогрес. Поки що — заглушка.
        </p>
      </header>

      @if (auth.isAdmin()) {
        <a
          routerLink="/admin"
          class="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Перейти в адмінку
        </a>
      }
    </section>
  `,
})
export class AppHomePage {
  protected readonly auth = inject(AuthStore);
}
