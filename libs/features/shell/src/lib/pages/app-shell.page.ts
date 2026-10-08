import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '@org/auth';
import { BrandingService } from '@org/data';
import { ToastHostComponent } from '../toast/toast-host.component';

interface ShellNavItem {
  link: string;
  label: string;
  exact: boolean;
}

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
            @for (item of navItems(); track item.link) {
              <a
                [routerLink]="item.link"
                routerLinkActive="text-primary"
                [routerLinkActiveOptions]="{ exact: item.exact }"
                class="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-primary"
              >{{ item.label }}</a>
            }
          </nav>

          <div class="flex items-center gap-3">
            @switch (auth.role()) {
              @case ('admin') {
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Адмін</span>
              }
              @case ('instructor') {
                <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Інструктор</span>
              }
              @case ('student') {
                <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">Клієнт</span>
              }
            }
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

        <nav aria-label="Main" class="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:hidden">
          @for (item of navItems(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="text-primary"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-primary"
            >{{ item.label }}</a>
          }
        </nav>
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

  protected readonly navItems = computed<ShellNavItem[]>(() => {
    const items: ShellNavItem[] = [
      { link: '/app', label: 'Прогрес', exact: true },
      { link: '/app/schedule', label: 'Розклад', exact: true },
    ];
    if (this.auth.isAdmin()) {
      items.push({ link: '/admin', label: 'Адмін', exact: false });
    }
    return items;
  });

  protected studioInitial(): string {
    return this.branding.studioName().trim().charAt(0).toUpperCase() || 'P';
  }

  protected async onSignOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/sign-in', { replaceUrl: true });
  }
}
