import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="p-6">
      <h1 class="text-xl font-semibold">Access denied</h1>
      <p class="mt-2">You don’t have permission to view this page.</p>
    </main>
  `,
})
export class ForbiddenPage {}
