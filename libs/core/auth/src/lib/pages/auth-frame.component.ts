import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'pp-auth-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-neutral-950 text-white lg:grid lg:grid-cols-2">
      <section class="relative hidden overflow-hidden lg:flex lg:items-center lg:px-16">
        <div
          class="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-primary/40 blur-3xl"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute bottom-10 right-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
          aria-hidden="true"
        ></div>
        <div class="relative z-10 max-w-md">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-primary-100">Pole Progress</p>
          <h1 class="mt-4 text-4xl font-semibold tracking-tight text-white">Щоденник студії</h1>
          <p class="mt-4 text-base leading-relaxed text-neutral-300">
            Спроби, етапи елементів і розклад. Вхід для клієнтів з активним членством і для команди студії.
          </p>
        </div>
      </section>

      <section class="flex min-h-screen items-center justify-center px-4 py-12">
        <div class="w-full max-w-md">
          <ng-content />
        </div>
      </section>
    </main>
  `,
})
export class AuthFrameComponent {}
