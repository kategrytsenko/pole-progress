import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, type Toast } from './toast.service';

@Component({
  selector: 'pp-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      aria-live="polite"
      aria-relevant="additions removals"
      class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      @for (toast of toasts.entries(); track toast.id) {
        <div
          [class]="toastClass(toast)"
          role="status"
        >
          <span class="flex-1 break-words text-sm">{{ toast.message }}</span>
          <button
            type="button"
            (click)="dismiss(toast.id)"
            aria-label="Закрити сповіщення"
            class="ml-2 rounded p-1 text-current/70 transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);

  protected dismiss(id: number): void {
    this.toasts.dismiss(id);
  }

  protected toastClass(toast: Toast): string {
    const base =
      'pointer-events-auto flex items-start gap-2 rounded-lg px-3 py-2 shadow-lg ring-1 ring-black/5 transition';
    switch (toast.level) {
      case 'success':
        return `${base} bg-emerald-600 text-white`;
      case 'error':
        return `${base} bg-red-600 text-white`;
      default:
        return `${base} bg-neutral-900 text-white`;
    }
  }
}
