import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { accessBenefitCopy } from '../access-benefit';
import { AuthStore } from '../auth.store';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'pp-access-pending',
  imports: [AuthFrameComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <pp-auth-frame>
      <section
        class="rounded-2xl bg-white p-6 text-neutral-900 shadow-xl shadow-black/20 sm:p-8"
        aria-labelledby="access-title"
      >
        @if (!ready()) {
          <h1 id="access-title" class="text-xl font-semibold text-neutral-950">Перевіряємо членство…</h1>
          <div
            class="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary"
            role="status"
            aria-label="Loading"
          ></div>
        } @else if (failed()) {
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Перевірка</p>
          <h1 id="access-title" class="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            Не вдалось перевірити доступ
          </h1>
          <p class="mt-2 text-sm leading-relaxed text-neutral-600">
            {{ auth.error() ?? 'Перевір зʼєднання і спробуй ще раз.' }}
          </p>
          <div class="mt-6 flex flex-col gap-3">
            <button
              type="button"
              class="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              [disabled]="busy()"
              (click)="retry()"
            >
              Спробувати ще раз
            </button>
            <button
              type="button"
              class="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-800"
              [disabled]="busy()"
              (click)="signOut()"
            >
              Вийти
            </button>
          </div>
        } @else {
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Без абонемента</p>
          <h1 id="access-title" class="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            Розклад і публічні щоденники вже відкриті
          </h1>
          @if (benefit(); as card) {
            <ul class="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-neutral-600">
              <li>{{ card.now }}</li>
              @if (card.profile) {
                <li>{{ card.profile }}</li>
              }
              <li>{{ card.pass }}</li>
            </ul>
          }
          @if (email(); as address) {
            <p class="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
              Увійшли як <span class="font-medium text-neutral-900">{{ address }}</span>
            </p>
          }
          <a
            routerLink="/app/schedule"
            class="mt-6 block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Розклад
          </a>
          <a
            routerLink="/app/journals"
            class="mt-3 block w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
          >
            Публічні щоденники
          </a>
          <a
            routerLink="/app/profile"
            class="mt-3 block w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
          >
            Профіль і пароль
          </a>
          <button
            type="button"
            class="mt-3 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
            [disabled]="busy()"
            (click)="signOut()"
          >
            Вийти
          </button>
        }
      </section>
    </pp-auth-frame>
  `,
})
export class AccessPendingPage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly ready = computed(() => this.auth.accessResolved());
  protected readonly failed = computed(() => this.auth.studioAccess() === 'error');
  protected readonly email = computed(() => this.auth.user()?.email ?? null);
  protected readonly benefit = computed(() =>
    accessBenefitCopy({
      profileComplete: this.auth.profileComplete(),
      hasStudioAccess: this.auth.hasStudioAccess(),
      redirected: false,
    }),
  );

  constructor() {
    effect(() => {
      if (!this.auth.accessResolved()) return;
      if (!this.auth.isAuthed()) {
        void this.router.navigateByUrl('/sign-in', { replaceUrl: true });
        return;
      }
      if (this.auth.hasStudioAccess()) {
        void this.router.navigateByUrl('/app', { replaceUrl: true });
      }
    });
  }

  protected async retry(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.refreshStudioAccess();
    } finally {
      this.busy.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/sign-in', { replaceUrl: true });
    } finally {
      this.busy.set(false);
    }
  }
}
