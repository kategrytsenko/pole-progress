import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { destinationAfterAuth } from '../auth-redirect';
import { toAuthError } from '../auth-errors';
import { AuthStore } from '../auth.store';
import { passwordFormError } from '../password-rules';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'pp-auth-callback',
  imports: [FormsModule, RouterLink, AuthFrameComponent],
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
        } @else if (showRecovery()) {
          <h1 class="text-xl font-semibold text-neutral-950">Новий пароль</h1>
          <p class="mt-2 text-sm text-neutral-600">Обери пароль для цього ж акаунта. Окремий акаунт не створюється.</p>
          <form (ngSubmit)="onRecoverySubmit()" novalidate class="mt-6 space-y-4 text-left">
            <label class="block">
              <span class="block text-sm font-medium text-neutral-800">Новий пароль</span>
              <input
                name="password"
                type="password"
                autocomplete="new-password"
                required
                minlength="6"
                [disabled]="busy()"
                [(ngModel)]="passwordValue"
                class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                placeholder="Щонайменше 6 символів"
              />
            </label>
            <label class="block">
              <span class="block text-sm font-medium text-neutral-800">Ще раз пароль</span>
              <input
                name="confirm"
                type="password"
                autocomplete="new-password"
                required
                [disabled]="busy()"
                [(ngModel)]="confirmValue"
                class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </label>
            @if (formError(); as err) {
              <p class="text-sm text-rose-600" role="alert">{{ err }}</p>
            }
            <button
              type="submit"
              [disabled]="busy()"
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ busy() ? 'Зберігаємо…' : 'Зберегти пароль' }}
            </button>
          </form>
        } @else if (timedOut()) {
          <h1 class="text-xl font-semibold text-neutral-950">Час очікування вийшов</h1>
          <p class="mt-2 text-sm text-neutral-600">Сесія не з'явилась. Спробуй увійти ще раз.</p>
          <a routerLink="/sign-in" class="mt-6 inline-block text-sm font-medium text-primary underline">
            На сторінку входу
          </a>
        } @else {
          <h1 class="text-xl font-semibold text-neutral-950">Заходимо…</h1>
          <p class="mt-2 text-sm text-neutral-600">Підтверджуємо сесію і членство студії.</p>
          <div
            class="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary"
            role="status"
            aria-label="Завантаження"
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

  private readonly recoveryMode = this.route.snapshot.queryParamMap.get('type') === 'recovery';

  protected passwordValue = '';
  protected confirmValue = '';
  protected readonly formError = signal<string | null>(null);
  protected readonly passwordSaved = signal(false);
  protected readonly timedOut = signal(false);
  protected readonly busy = computed(() => this.auth.loading());

  protected readonly errorText = computed(() => {
    const urlError = this.route.snapshot.queryParamMap.get('error_description')
      ?? this.route.snapshot.queryParamMap.get('error');
    if (urlError) return toAuthError(urlError);
    if (this.formError()) return null;
    return this.auth.error();
  });

  protected readonly showRecovery = computed(() =>
    this.recoveryMode
    && !this.passwordSaved()
    && this.auth.isAuthed()
    && this.auth.accessResolved()
    && !this.errorText(),
  );

  constructor() {
    effect(() => {
      if (this.errorText()) return;
      if (this.recoveryMode && !this.passwordSaved()) return;
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

  protected async onRecoverySubmit(): Promise<void> {
    this.formError.set(null);
    const issue = passwordFormError(this.passwordValue, this.confirmValue);
    if (issue) {
      this.formError.set(issue);
      return;
    }

    const saved = await this.auth.updatePassword(this.passwordValue);
    if (!saved) {
      this.formError.set(this.auth.error() ?? 'Не вдалось зберегти пароль');
      this.auth.clearError();
      return;
    }
    this.passwordSaved.set(true);
  }

  private async complete(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    await this.auth.completeAuthCallback({
      code: params.get('code'),
      tokenHash: params.get('token_hash'),
      otpType: params.get('type'),
    });

    if (!this.auth.session() && !this.errorText()) {
      this.timedOut.set(true);
    }
  }
}
