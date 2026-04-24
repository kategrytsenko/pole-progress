import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <section class="text-center">
        <p class="text-sm font-semibold text-primary">404</p>
        <h1 class="mt-2 text-2xl font-semibold text-neutral-900">Сторінку не знайдено</h1>
        <p class="mt-2 text-sm text-neutral-600">Можливо, лінк застарів або був надрукований неправильно.</p>
        <a
          routerLink="/app"
          class="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          На головну
        </a>
      </section>
    </main>
  `,
})
export class NotFoundPage {}
