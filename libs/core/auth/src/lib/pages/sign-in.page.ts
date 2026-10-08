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
import { ActivatedRoute, Router } from '@angular/router';
import type { StudioOAuthProvider } from '../auth-api';
import { destinationAfterAuth, safeInternalPath } from '../auth-redirect';
import { AuthStore } from '../auth.store';
import { AuthFrameComponent } from './auth-frame.component';

type SignInMethod = 'password' | 'link';
type SignInIntent = 'sign-in' | 'sign-up';

@Component({
  selector: 'pp-sign-in',
  imports: [FormsModule, AuthFrameComponent],
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
            Пароль, Google або посилання на email. Доступ відкриється після перевірки членства.
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
        } @else if (sentTo(); as to) {
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">
            <p class="font-medium">Лист відправлено на {{ to }}.</p>
            <p class="mt-1">Відкрий посилання в цьому ж вікні — так сесія збережеться.</p>
            <button type="button" class="mt-3 font-medium underline underline-offset-2" (click)="resetNotices()">
              Надіслати інше
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="busy()"
              (click)="onOAuth('google')"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8A6.4 6.4 0 1 1 12 5.6c1.7 0 2.9.7 3.6 1.4l2.5-2.4C16.7 3.2 14.6 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c6.6 0 8.7-4.6 8.7-7 0-.5-.1-.9-.1-1.2H12z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="busy()"
              (click)="onOAuth('instagram')"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-5 3.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.2 6.6a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"/>
              </svg>
              Instagram
            </button>
          </div>

          <div class="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-400">
            <span class="h-px flex-1 bg-neutral-200"></span>
            або
            <span class="h-px flex-1 bg-neutral-200"></span>
          </div>

          <div class="mb-5 grid grid-cols-2 rounded-lg bg-neutral-100 p-1" role="tablist" aria-label="Спосіб входу">
            <button
              type="button"
              role="tab"
              class="rounded-md px-3 py-2 text-sm font-medium transition"
              [class.bg-white]="method() === 'password'"
              [class.text-neutral-900]="method() === 'password'"
              [class.shadow-sm]="method() === 'password'"
              [class.text-neutral-500]="method() !== 'password'"
              [attr.aria-selected]="method() === 'password'"
              (click)="selectMethod('password')"
            >
              Пароль
            </button>
            <button
              type="button"
              role="tab"
              class="rounded-md px-3 py-2 text-sm font-medium transition"
              [class.bg-white]="method() === 'link'"
              [class.text-neutral-900]="method() === 'link'"
              [class.shadow-sm]="method() === 'link'"
              [class.text-neutral-500]="method() !== 'link'"
              [attr.aria-selected]="method() === 'link'"
              (click)="selectMethod('link')"
            >
              Посилання
            </button>
          </div>

          @if (method() === 'password') {
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

            <button
              type="button"
              class="mt-4 text-sm font-medium text-primary underline-offset-2 hover:underline"
              (click)="toggleIntent()"
            >
              {{ intent() === 'sign-in' ? 'Немає акаунта? Створити' : 'Вже є акаунт? Увійти' }}
            </button>
          } @else {
            <form (ngSubmit)="onMagicSubmit()" novalidate class="space-y-4">
              <label class="block">
                <span class="block text-sm font-medium text-neutral-800">Email</span>
                <input
                  #emailInput
                  name="magicEmail"
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

              @if (alertText(); as err) {
                <p class="text-sm text-rose-600" role="alert">{{ err }}</p>
              }

              <button
                type="submit"
                [disabled]="busy()"
                class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ busy() ? 'Відправляємо…' : 'Надіслати посилання' }}
              </button>
            </form>
          }
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

  protected readonly method = signal<SignInMethod>('password');
  protected readonly intent = signal<SignInIntent>('sign-in');
  protected readonly sentTo = signal<string | null>(null);
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
      void this.router.navigateByUrl(destinationAfterAuth(this.auth.hasStudioAccess(), requested));
    });

    effect(() => {
      if (this.sentTo() || this.confirmationEmail()) return;
      this.method();
      const input = this.emailInput()?.nativeElement;
      if (input && document.activeElement !== input) input.focus();
    });
  }

  protected selectMethod(method: SignInMethod): void {
    this.method.set(method);
    this.formError.set(null);
    this.auth.clearError();
  }

  protected toggleIntent(): void {
    this.intent.update((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
    this.formError.set(null);
    this.auth.clearError();
  }

  protected resetNotices(): void {
    this.sentTo.set(null);
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
    if (password.length < 6) {
      this.formError.set('Пароль має містити щонайменше 6 символів.');
      return;
    }
    if (this.intent() === 'sign-up' && password !== this.confirmValue) {
      this.formError.set('Паролі не збігаються.');
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

  protected async onMagicSubmit(): Promise<void> {
    this.formError.set(null);
    const email = this.emailValue.trim();
    if (!this.emailOk(email)) {
      this.formError.set('Введи коректний email.');
      return;
    }

    this.rememberRedirect();
    await this.auth.signInMagicLink(email);
    if (!this.auth.error()) this.sentTo.set(email);
  }

  protected async onOAuth(provider: StudioOAuthProvider): Promise<void> {
    this.formError.set(null);
    this.rememberRedirect();
    await this.auth.signInWithOAuth(provider);
  }

  private emailOk(email: string): boolean {
    return email.length > 0 && /.+@.+\..+/.test(email);
  }

  private rememberRedirect(): void {
    const requested = this.route.snapshot.queryParamMap.get('redirect') ?? '/app';
    sessionStorage.setItem('pp-auth-redirect', safeInternalPath(requested) ?? '/app');
  }
}
