import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { JournalsApi } from '@org/data';
import { ToastService } from '@org/shell';

@Component({
  selector: 'pp-journal-visibility',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ready()) {
      <div class="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <div>
          <p id="journal-visibility-label" class="text-sm font-semibold text-neutral-900">
            {{ isPublic() ? 'Публічний щоденник' : 'Приватний щоденник' }}
          </p>
          <p class="mt-1 text-sm text-neutral-600">
            Інші клієнти студії бачитимуть спроби, фото та відео.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-labelledby="journal-visibility-label"
          [attr.aria-checked]="isPublic()"
          [disabled]="saving()"
          (click)="onToggle()"
          [class]="switchClass()"
        >
          <span aria-hidden="true" [class]="knobClass()"></span>
        </button>
      </div>
    }
  `,
})
export class JournalVisibilityComponent implements OnInit {
  private readonly journals = inject(JournalsApi);
  private readonly toasts = inject(ToastService);

  protected readonly isPublic = signal(false);
  protected readonly ready = signal(false);
  protected readonly saving = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  protected knobClass(): string {
    const shift = this.isPublic() ? 'translate-x-5' : 'translate-x-0.5';
    return `pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition ${shift}`;
  }

  protected switchClass(): string {
    const tone = this.isPublic() ? 'bg-primary' : 'bg-neutral-300';
    return `relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${tone}`;
  }

  protected async onToggle(): Promise<void> {
    if (this.saving()) return;
    const next = !this.isPublic();
    this.saving.set(true);
    try {
      await this.journals.setMyJournalPublic(next);
      this.isPublic.set(next);
      this.toasts.success(next ? 'Щоденник публічний' : 'Щоденник приватний');
    } catch (err: unknown) {
      this.toasts.error(
        err instanceof Error ? err.message : 'Не вдалося змінити видимість щоденника',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      this.isPublic.set(await this.journals.isJournalPublic());
      this.ready.set(true);
    } catch (err: unknown) {
      this.toasts.error(
        err instanceof Error ? err.message : 'Не вдалося завантажити видимість щоденника',
      );
    }
  }
}
