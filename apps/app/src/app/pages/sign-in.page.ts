import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-sign-in',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="p-6">
      <h1 class="text-xl font-semibold">Sign in</h1>
      <p class="mt-2">Next step: implement real sign-in form.</p>
    </main>
  `,
})
export class SignInPage {}
