import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../auth.store';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'pp-forgot-password',
  imports: [FormsModule, RouterLink, AuthFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <pp-auth-frame>
      <section
        class="rounded-2xl bg-white p-6 text-neutral-900 shadow-xl shadow-black/20 sm:p-8"
        aria-labelledby="reset-title"
      >
        <header class="mb-6">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary lg:hidden">Pole Progress</p>
          <h1 id="reset-title" class="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 lg:mt-0">
            Відновлення пароля
          </h1>
          <p class="mt-1 text-sm text-neutral-600">
            Надішлемо лист із посиланням. Його можна відкрити в будь-якому браузері.
          </p>
        </header>

        @if (sentTo(); as email) {
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">
            <p class="font-medium">Якщо акаунт {{ email }} існує, лист уже в дорозі.</p>
            <p class="mt-1">Відкрий посилання і обери новий пароль. Перевір також папку спаму.</p>
          </div>
        } @else {
          <form (ngSubmit)="onSubmit()" novalidate class="space-y-4">
            <label class="block">
              <span class="block text-sm font-medium text-neutral-800">Email</span>
              <input
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

            @if (alertText(); as err) {
              <p class="text-sm text-rose-600" role="alert">{{ err }}</p>
            }

            <button
              type="submit"
              [disabled]="busy()"
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ busy() ? 'Відправляємо…' : 'Надіслати лист' }}
            </button>
          </form>
        }

        <a routerLink="/sign-in" class="mt-6 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline">
          Повернутись до входу
        </a>
      </section>
    </pp-auth-frame>
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthStore);

  protected emailValue = '';
  protected readonly sentTo = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly busy = computed(() => this.auth.loading());
  protected readonly alertText = computed(() => this.formError() ?? this.auth.error());

  protected async onSubmit(): Promise<void> {
    this.formError.set(null);
    const email = this.emailValue.trim();
    if (email.length === 0 || !/.+@.+\..+/.test(email)) {
      this.formError.set('Введи коректний email.');
      return;
    }

    const sent = await this.auth.requestPasswordReset(email);
    if (sent) this.sentTo.set(email);
  }
}
