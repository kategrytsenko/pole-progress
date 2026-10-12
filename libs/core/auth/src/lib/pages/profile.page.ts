import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../auth.store';
import { passwordFormError } from '../password-rules';
import { ProfilesApi } from '../profiles.api';

@Component({
  selector: 'pp-profile',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-lg" aria-labelledby="profile-title">
      <header class="mb-6">
        <h1 id="profile-title" class="text-2xl font-semibold tracking-tight text-neutral-950">Профіль</h1>
        <p class="mt-1 text-sm text-neutral-600">Ім'я видно в щоденнику. Пароль зберігається лише в обліковому записі.</p>
      </header>

      @if (!auth.hasStudioAccess()) {
        <p class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Членство студії ще не активне.
          <a routerLink="/access-pending" class="font-medium underline underline-offset-2">Деталі доступу</a>
        </p>
      }

      @if (status() === 'loading') {
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary"
          role="status"
          aria-label="Завантаження"
        ></div>
      } @else if (status() === 'missing') {
        <p class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          Профіль акаунта не знайдено. Це не те саме, що відсутність абонемента. Звернись до адміністратора.
        </p>
        @if (email(); as address) {
          <p class="mt-4 text-sm text-neutral-600">Email: <span class="font-medium text-neutral-900">{{ address }}</span></p>
        }
      } @else if (status() === 'error') {
        <p class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          Не вдалось завантажити профіль. Перевір з’єднання і онови сторінку.
        </p>
      } @else if (status() === 'ready') {
        <form (ngSubmit)="onSaveName()" novalidate class="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <label class="block">
            <span class="block text-sm font-medium text-neutral-800">Ім'я</span>
            <input
              name="name"
              type="text"
              autocomplete="name"
              maxlength="80"
              [disabled]="nameBusy()"
              [(ngModel)]="nameValue"
              class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              placeholder="Як до тебе звертатись"
            />
          </label>

          <div>
            <span class="block text-sm font-medium text-neutral-800">Email</span>
            <p class="mt-1 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-800">{{ email() ?? '—' }}</p>
          </div>

          @if (nameError(); as err) {
            <p class="text-sm text-rose-600" role="alert">{{ err }}</p>
          }
          @if (nameSaved()) {
            <p class="text-sm text-emerald-700" role="status">Ім'я збережено.</p>
          }

          <button
            type="submit"
            [disabled]="nameBusy()"
            class="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ nameBusy() ? 'Зберігаємо…' : 'Зберегти ім’я' }}
          </button>
        </form>

        <form (ngSubmit)="onSavePassword()" novalidate class="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 class="text-base font-semibold text-neutral-950">Пароль</h2>
          <p class="text-sm text-neutral-600">
            Можна задати або змінити пароль для цього акаунта, зокрема якщо ти входив через Google.
          </p>

          <label class="block">
            <span class="block text-sm font-medium text-neutral-800">Новий пароль</span>
            <input
              name="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
              [disabled]="passwordBusy()"
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
              [disabled]="passwordBusy()"
              [(ngModel)]="confirmValue"
              class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
          </label>

          @if (passwordError(); as err) {
            <p class="text-sm text-rose-600" role="alert">{{ err }}</p>
          }
          @if (passwordSaved()) {
            <p class="text-sm text-emerald-700" role="status">Пароль збережено. Тепер можна входити і з паролем.</p>
          }

          <button
            type="submit"
            [disabled]="passwordBusy()"
            class="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ passwordBusy() ? 'Зберігаємо…' : 'Зберегти пароль' }}
          </button>
        </form>
      }
    </section>
  `,
})
export class ProfilePage {
  protected readonly auth = inject(AuthStore);
  private readonly profiles = inject(ProfilesApi);

  protected nameValue = '';
  protected passwordValue = '';
  protected confirmValue = '';

  protected readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly nameBusy = signal(false);
  protected readonly passwordBusy = signal(false);
  protected readonly nameError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly nameSaved = signal(false);
  protected readonly passwordSaved = signal(false);
  protected readonly email = computed(() => this.auth.user()?.email ?? null);

  constructor() {
    void this.load();
  }

  protected async onSaveName(): Promise<void> {
    this.nameError.set(null);
    this.nameSaved.set(false);
    const name = this.nameValue.trim();
    if (name.length > 80) {
      this.nameError.set('Ім’я має бути не довшим за 80 символів.');
      return;
    }

    this.nameBusy.set(true);
    try {
      this.nameValue = await this.profiles.updateMyName(name);
      this.nameSaved.set(true);
    } catch {
      this.nameError.set('Не вдалося зберегти ім’я.');
    } finally {
      this.nameBusy.set(false);
    }
  }

  protected async onSavePassword(): Promise<void> {
    this.passwordError.set(null);
    this.passwordSaved.set(false);
    const issue = passwordFormError(this.passwordValue, this.confirmValue);
    if (issue) {
      this.passwordError.set(issue);
      return;
    }

    this.passwordBusy.set(true);
    try {
      const saved = await this.auth.updatePassword(this.passwordValue);
      if (!saved) {
        this.passwordError.set(this.auth.error() ?? 'Не вдалось зберегти пароль');
        this.auth.clearError();
        return;
      }
      this.passwordValue = '';
      this.confirmValue = '';
      this.passwordSaved.set(true);
    } finally {
      this.passwordBusy.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      const profile = await this.profiles.getMyProfile();
      if (!profile) {
        this.status.set('missing');
        return;
      }
      this.nameValue = profile.name ?? '';
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }
}
