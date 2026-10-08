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
import { AuthStore } from '../auth.store';

@Component({
  selector: 'pp-sign-in',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <section
        class="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-neutral-200"
        aria-labelledby="signin-title"
      >
        <header class="mb-6">
          <h1 id="signin-title" class="text-2xl font-semibold tracking-tight text-neutral-900">
            Pole Progress
          </h1>
          <p class="mt-1 text-sm text-neutral-600">Введи свій email — ми надішлемо посилання для входу.</p>
        </header>

        @if (sentTo(); as to) {
          <div
            class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            role="status"
            aria-live="polite"
          >
            <p class="font-medium">Лист відправлено на {{ to }}.</p>
            <p class="mt-1">Перевір інбокс і клікни на посилання — це залогінить тебе.</p>
            <button
              type="button"
              class="mt-3 text-sm font-medium underline underline-offset-2 hover:text-emerald-700"
              (click)="reset()"
            >
              Відправити ще раз
            </button>
          </div>
        } @else {
          <form (ngSubmit)="onSubmit()" novalidate class="space-y-4">
            <label class="block">
              <span class="block text-sm font-medium text-neutral-800">Email</span>
              <input
                #emailInput
                name="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                required
                [disabled]="busy()"
                [(ngModel)]="emailValue"
                class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                placeholder="you@example.com"
                aria-describedby="email-error"
              />
            </label>

            @if (errorText(); as err) {
              <p id="email-error" class="text-sm text-rose-600" role="alert">{{ err }}</p>
            }

            <button
              type="submit"
              [disabled]="busy() || !canSubmit()"
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ busy() ? 'Відправляємо…' : 'Надіслати посилання' }}
            </button>
          </form>
        }

        <p class="mt-6 text-xs text-neutral-500">
          Маєш питання? Звернись до адміна студії.
          <a routerLink="/forbidden" class="hidden">.</a>
        </p>
      </section>
    </main>
  `,
})
export class SignInPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected emailValue = '';
  protected readonly sentTo = signal<string | null>(null);
  protected readonly busy = computed(() => this.auth.loading());
  protected readonly errorText = computed(() => this.auth.error());
  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');

  constructor() {
    effect(() => {
      if (this.auth.isAuthed()) {
        const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app';
        void this.router.navigateByUrl(redirect);
      }
    });

    effect(() => {
      if (this.sentTo()) return;
      const input = this.emailInput()?.nativeElement;
      if (input && document.activeElement !== input) {
        input.focus();
      }
    });
  }

  protected canSubmit(): boolean {
    const v = this.emailValue.trim();
    return v.length > 0 && /.+@.+\..+/.test(v);
  }

  protected async onSubmit(): Promise<void> {
    const email = this.emailValue.trim();
    if (!email || !this.canSubmit()) return;

    const redirectQuery = this.route.snapshot.queryParamMap.get('redirect') ?? '/app';
    sessionStorage.setItem('pp-auth-redirect', redirectQuery);
    const redirectTo = `${window.location.origin}/auth/callback`;

    await this.auth.signInMagicLink(email, redirectTo);
    if (!this.auth.error()) this.sentTo.set(email);
  }

  protected reset(): void {
    this.sentTo.set(null);
  }
}
