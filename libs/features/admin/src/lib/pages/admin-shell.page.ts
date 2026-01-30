import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'pp-admin-shell',
  template: `
    <main class="p-6">
      <h1 class="text-2xl font-semibold">Admin</h1>
      <p class="mt-2 text-sm opacity-80">You have access ✅</p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellPage {}
