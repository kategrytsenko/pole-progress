import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastHostComponent } from '@org/shell';

@Component({
  selector: 'pp-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-neutral-50 text-neutral-900">
      <header class="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div class="flex items-center gap-2">
            <a
              routerLink="/app"
              class="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-primary"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              До застосунку
            </a>
            <span class="text-neutral-300" aria-hidden="true">/</span>
            <span class="text-sm font-semibold tracking-tight">Адмін-панель</span>
          </div>
        </div>

        <nav aria-label="Адмін-розділи" class="border-t border-neutral-200">
          <div class="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4">
            <a
              routerLink="categories"
              routerLinkActive="border-primary text-primary"
              [routerLinkActiveOptions]="{ exact: false }"
              class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-primary"
            >Категорії</a>
            <a
              routerLink="elements"
              routerLinkActive="border-primary text-primary"
              [routerLinkActiveOptions]="{ exact: false }"
              class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-primary"
            >Елементи</a>
            <a
              routerLink="branding"
              routerLinkActive="border-primary text-primary"
              [routerLinkActiveOptions]="{ exact: false }"
              class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 transition hover:text-primary"
            >Брендинг</a>
          </div>
        </nav>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-6">
        <router-outlet />
      </main>
    </div>

    <pp-toast-host />
  `,
})
export class AdminShellPage {}
