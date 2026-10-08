import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { destinationAfterAuth } from '../auth-redirect';
import { AuthStore } from '../auth.store';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'pp-auth-callback',
  imports: [RouterLink, AuthFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <pp-auth-frame>
      <section
        class="rounded-2xl bg-white p-8 text-center text-neutral-900 shadow-xl shadow-black/20"
        aria-live="polite"
      >
        @if (errorText(); as err) {
          <h1 class="text-xl font-semibold text-rose-700">Не вдалось увійти</h1>
          <p class="mt-2 text-sm text-neutral-600">{{ err }}</p>
          <a routerLink="/sign-in" class="mt-6 inline-block text-sm font-medium text-primary underline">
            Спробувати ще раз
          </a>
        } @else if (timedOut()) {
          <h1 class="text-xl font-semibold text-neutral-950">Час очікування вийшов</h1>
          <p class="mt-2 text-sm text-neutral-600">
            Сесія не з'явилась. Посилання могло застаріти — запроси нове або увійди з паролем.
          </p>
          <a routerLink="/sign-in" class="mt-6 inline-block text-sm font-medium text-primary underline">
            На сторінку входу
          </a>
        } @else {
          <h1 class="text-xl font-semibold text-neutral-950">Заходимо…</h1>
          <p class="mt-2 text-sm text-neutral-600">Підтверджуємо сесію і членство студії.</p>
          <div
            class="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary"
            role="status"
            aria-label="Loading"
          ></div>
        }
      </section>
    </pp-auth-frame>
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
      const urlError = this.route.snapshot.queryParamMap.get('error_description')
        ?? this.route.snapshot.queryParamMap.get('error');
      if (urlError) return;
      if (!this.auth.isAuthed() || !this.auth.accessResolved()) return;
      const requested = this.route.snapshot.queryParamMap.get('redirect')
        ?? sessionStorage.getItem('pp-auth-redirect');
      sessionStorage.removeItem('pp-auth-redirect');
      void this.router.navigateByUrl(
        destinationAfterAuth(this.auth.hasStudioAccess(), requested),
        { replaceUrl: true },
      );
    });

    void this.complete();
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
