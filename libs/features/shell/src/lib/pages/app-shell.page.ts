import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '@org/auth';
import { BrandingService } from '@org/data';
import { ToastHostComponent } from '../toast/toast-host.component';

@Component({
  selector: 'pp-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-sm focus:font-medium focus:text-white"
    >
      Перейти до контенту
    </a>

    <div class="min-h-screen bg-neutral-50 text-neutral-900">
      <header class="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a routerLink="/app" class="flex items-center gap-2 text-base font-semibold tracking-tight">
            @if (branding.logoUrl(); as logo) {
              <img
                [src]="logo"
                [alt]="branding.studioName()"
                class="h-7 w-7 rounded-md object-cover"
              />
            } @else {
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-white"
                aria-hidden="true"
              >{{ studioInitial() }}</span>
            }
            <span>{{ branding.studioName() }}</span>
          </a>

          <nav aria-label="Main" class="hidden items-center gap-2 sm:flex">
            <a
              routerLink="/app"
              routerLinkActive="text-primary"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-primary"
            >Прогрес</a>

            @if (auth.isAdmin()) {
              <a
                routerLink="/admin"
                routerLinkActive="text-primary"
                class="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-primary"
              >Адмін</a>
            }
          </nav>

          <div class="flex items-center gap-3">
            <span class="hidden text-xs text-neutral-500 sm:block">{{ auth.user()?.email }}</span>
            <button
              type="button"
              (click)="onSignOut()"
              class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
            >
              Вийти
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" class="mx-auto max-w-6xl px-4 py-6">
        <router-outlet />
      </main>
    </div>

    <pp-toast-host />
  `,
})
export class AppShellPage {
  protected readonly auth = inject(AuthStore);
  protected readonly branding = inject(BrandingService);
  private readonly router = inject(Router);

  protected studioInitial(): string {
    return this.branding.studioName().trim().charAt(0).toUpperCase() || 'P';
  }

  protected async onSignOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/sign-in', { replaceUrl: true });
  }
}
