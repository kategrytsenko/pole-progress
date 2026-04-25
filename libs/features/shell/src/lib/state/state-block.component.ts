import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type StateBlockMode = 'loading' | 'error' | 'empty';

@Component({
  selector: 'pp-state-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (mode) {
      @case ('loading') {
        <div role="status" class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
          <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary" aria-hidden="true"></span>
          <span>{{ message || 'Завантаження…' }}</span>
        </div>
      }
      @case ('error') {
        <p
          role="alert"
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >{{ message || 'Сталася помилка' }}</p>
      }
      @case ('empty') {
        <p
          class="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500"
        >{{ message || 'Нічого не знайдено' }}</p>
      }
    }
  `,
})
export class StateBlockComponent {
  @Input({ required: true }) mode!: StateBlockMode;
  @Input() message?: string | null;
}
