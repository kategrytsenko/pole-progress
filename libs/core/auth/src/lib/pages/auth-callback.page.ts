import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../auth.store';

@Component({
  selector: 'pp-auth-callback',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <section
        class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-neutral-200"
        aria-live="polite"
      >
        @if (errorText(); as err) {
          <h1 class="text-xl font-semibold text-rose-700">Не вдалось залогінитись</h1>
          <p class="mt-2 text-sm text-neutral-600">{{ err }}</p>
          <a routerLink="/sign-in" class="mt-6 inline-block text-sm font-medium text-primary underline">
            Спробувати ще раз
          </a>
        } @else if (timedOut()) {
          <h1 class="text-xl font-semibold text-neutral-900">Час очікування вийшов</h1>
          <p class="mt-2 text-sm text-neutral-600">
            Сесія не з'явилась. Можливо, посилання застаріло — запроси нове.
          </p>
          <a routerLink="/sign-in" class="mt-6 inline-block text-sm font-medium text-primary underline">
            На сторінку входу
          </a>
        } @else {
          <h1 class="text-xl font-semibold text-neutral-900">Заходимо…</h1>
          <p class="mt-2 text-sm text-neutral-600">Перевіряємо твоє посилання.</p>
          <div
            class="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary"
            role="status"
            aria-label="Loading"
          ></div>
        }
      </section>
    </main>
  `,
})
export class AuthCallbackPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly errorText = computed(() => {
    const urlError = this.route.snapshot.queryParamMap.get('error_description')
      ?? this.route.snapshot.queryParamMap.get('error');
    return urlError ?? this.auth.error();
  });

  protected readonly timedOut = signal(false);

  constructor() {
    effect(() => {
      if (!this.auth.session()) return;
      const redirect = this.redirectTarget();
      sessionStorage.removeItem('pp-auth-redirect');
      void this.router.navigateByUrl(redirect, { replaceUrl: true });
    });

    void this.complete();
  }

  private redirectTarget(): string {
    return (
      this.route.snapshot.queryParamMap.get('redirect')
      ?? sessionStorage.getItem('pp-auth-redirect')
      ?? '/app'
    );
  }

  private async complete(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    await this.auth.completeMagicLink({
      code: params.get('code'),
      tokenHash: params.get('token_hash'),
      otpType: params.get('type'),
    });

    if (!this.auth.session() && !this.errorText()) {
      this.timedOut.set(true);
    }
  }
}
