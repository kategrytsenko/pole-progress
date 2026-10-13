import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { destinationAfterAuth, safeInternalPath } from '../auth-redirect';
import { AuthStore } from '../auth.store';
import { passwordFormError } from '../password-rules';
import { AuthFrameComponent } from './auth-frame.component';

type SignInIntent = 'sign-in' | 'sign-up';

@Component({
  selector: 'pp-sign-in',
  imports: [FormsModule, RouterLink, AuthFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <pp-auth-frame>
      <section
        class="rounded-2xl bg-white p-6 text-neutral-900 shadow-xl shadow-black/20 sm:p-8"
        aria-labelledby="signin-title"
      >
        <header class="mb-6">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary lg:hidden">Pole Progress</p>
          <h1 id="signin-title" class="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 lg:mt-0">
            Вхід до студії
          </h1>
          <p class="mt-1 text-sm text-neutral-600">
            Пароль або Google. Доступ відкриється після перевірки членства.
          </p>
        </header>

        @if (confirmationEmail(); as email) {
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">
            <p class="font-medium">Підтверди {{ email }}</p>
            <p class="mt-1">Ми надіслали лист. Після підтвердження можна увійти з паролем.</p>
            <button type="button" class="mt-3 font-medium underline underline-offset-2" (click)="resetNotices()">
              Повернутись до входу
            </button>
          </div>
        } @else {
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="busy()"
            (click)="onGoogle()"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8A6.4 6.4 0 1 1 12 5.6c1.7 0 2.9.7 3.6 1.4l2.5-2.4C16.7 3.2 14.6 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c6.6 0 8.7-4.6 8.7-7 0-.5-.1-.9-.1-1.2H12z"/>
            </svg>
            Google
          </button>

          <div class="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-400">
            <span class="h-px flex-1 bg-neutral-200"></span>
            або
            <span class="h-px flex-1 bg-neutral-200"></span>
          </div>

          <form (ngSubmit)="onPasswordSubmit()" novalidate class="space-y-4">
            @if (intent() === 'sign-up') {
              <label class="block">
                <span class="block text-sm font-medium text-neutral-800">Ім'я</span>
                <input
                  name="name"
                  type="text"
                  autocomplete="name"
                  maxlength="80"
                  [disabled]="busy()"
                  [(ngModel)]="nameValue"
                  class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  placeholder="Як до тебе звертатись"
                />
              </label>
            }

            <label class="block">
              <span class="block text-sm font-medium text-neutral-800">Email</span>
              <input
                #emailInput
                name="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                spellcheck="false"
                required
                [disabled]="busy()"
                [(ngModel)]="emailValue"
                class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                placeholder="you@example.com"
              />
            </label>

            <label class="block">
              <span class="block text-sm font-medium text-neutral-800">Пароль</span>
              <input
                name="password"
                type="password"
                [attr.autocomplete]="intent() === 'sign-up' ? 'new-password' : 'current-password'"
                required
                minlength="6"
                [disabled]="busy()"
                [(ngModel)]="passwordValue"
                class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                placeholder="Щонайменше 6 символів"
              />
            </label>

            @if (intent() === 'sign-up') {
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
            }

            @if (alertText(); as err) {
              <p class="text-sm text-rose-600" role="alert">{{ err }}</p>
            }

            <button
              type="submit"
              [disabled]="busy()"
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ submitLabel() }}
            </button>
          </form>

          <div class="mt-4 flex flex-col gap-2 text-sm">
            @if (intent() === 'sign-in') {
              <a routerLink="/forgot-password" class="font-medium text-primary underline-offset-2 hover:underline">
                Забули пароль?
              </a>
            }
            <button
              type="button"
              class="self-start font-medium text-primary underline-offset-2 hover:underline"
              (click)="toggleIntent()"
            >
              {{ intent() === 'sign-in' ? 'Немає акаунта? Створити' : 'Вже є акаунт? Увійти' }}
            </button>
          </div>
        }

        <p class="mt-6 text-xs leading-relaxed text-neutral-500">
          Новий акаунт сам по собі не відкриває щоденник. Потрібне активне членство або роль команди.
        </p>
      </section>
    </pp-auth-frame>
  `,
})
export class SignInPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected emailValue = '';
  protected passwordValue = '';
  protected confirmValue = '';
  protected nameValue = '';

  protected readonly intent = signal<SignInIntent>('sign-in');
  protected readonly confirmationEmail = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly busy = computed(() => this.auth.loading());
  protected readonly alertText = computed(() => this.formError() ?? this.auth.error());
  protected readonly submitLabel = computed(() => {
    if (this.busy()) return this.intent() === 'sign-up' ? 'Створюємо…' : 'Заходимо…';
    return this.intent() === 'sign-up' ? 'Створити акаунт' : 'Увійти';
  });

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');

  constructor() {
    effect(() => {
      if (!this.auth.isAuthed() || !this.auth.accessResolved()) return;
      const requested = this.route.snapshot.queryParamMap.get('redirect')
        ?? sessionStorage.getItem('pp-auth-redirect');
      sessionStorage.removeItem('pp-auth-redirect');
      void this.router.navigateByUrl(
        destinationAfterAuth({
          hasStudioAccess: this.auth.hasStudioAccess(),
          profileComplete: this.auth.profileComplete(),
          requested,
        }),
      );
    });

    effect(() => {
      if (this.confirmationEmail()) return;
      const input = this.emailInput()?.nativeElement;
      if (input && document.activeElement !== input) input.focus();
    });
  }

  protected toggleIntent(): void {
    this.intent.update((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
    this.formError.set(null);
    this.auth.clearError();
  }

  protected resetNotices(): void {
    this.confirmationEmail.set(null);
    this.formError.set(null);
    this.auth.clearError();
  }

  protected async onPasswordSubmit(): Promise<void> {
    this.formError.set(null);
    const email = this.emailValue.trim();
    const password = this.passwordValue;
    if (!this.emailOk(email)) {
      this.formError.set('Введи коректний email.');
      return;
    }
    const passwordError = passwordFormError(password, this.intent() === 'sign-up' ? this.confirmValue : null);
    if (passwordError) {
      this.formError.set(passwordError);
      return;
    }

    this.rememberRedirect();
    if (this.intent() === 'sign-up') {
      const signedIn = await this.auth.signUpWithPassword({
        email,
        password,
        name: this.nameValue.trim() || undefined,
      });
      if (!this.auth.error() && !signedIn) this.confirmationEmail.set(email);
      return;
    }

    await this.auth.signInWithPassword(email, password);
  }

  protected async onGoogle(): Promise<void> {
    this.formError.set(null);
    this.rememberRedirect();
    await this.auth.signInWithOAuth('google');
  }

  private emailOk(email: string): boolean {
    return email.length > 0 && /.+@.+\..+/.test(email);
  }

  private rememberRedirect(): void {
    const requested = this.route.snapshot.queryParamMap.get('redirect') ?? '/app';
    sessionStorage.setItem('pp-auth-redirect', safeInternalPath(requested) ?? '/app');
  }
}
