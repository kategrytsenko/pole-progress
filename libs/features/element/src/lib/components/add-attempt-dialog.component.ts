import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '@org/shell';
import { ElementStore } from '../element.store';

const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4';
const ALLOWED_PREFIXES: readonly string[] = ['image/', 'video/'];

function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString().padStart(4, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isAllowedFile(file: File): boolean {
  return ALLOWED_PREFIXES.some((p) => file.type.startsWith(p));
}

@Component({
  selector: 'pp-add-attempt-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dlg
      (close)="onClose()"
      class="w-[min(520px,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <form method="dialog" (submit)="onSubmit($event)" class="flex flex-col">
        <header class="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 class="text-base font-semibold">Додати спробу</h2>
          <button
            type="button"
            (click)="close()"
            aria-label="Закрити"
            class="rounded p-1 text-neutral-500 hover:bg-neutral-100"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </header>

        <div class="flex flex-col gap-4 px-5 py-4">
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-800">Дата</span>
            <input
              type="date"
              required
              [ngModel]="date()"
              (ngModelChange)="date.set($event)"
              name="date"
              class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-800">Нотатка <span class="font-normal text-neutral-400">(необов'язково)</span></span>
            <textarea
              rows="3"
              [ngModel]="note()"
              (ngModelChange)="note.set($event)"
              name="note"
              class="resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            ></textarea>
          </label>

          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-800">Медіа <span class="font-normal text-neutral-400">(jpg, png, webp, mp4)</span></span>
            <input
              type="file"
              multiple
              [accept]="accept"
              (change)="onFilesSelected($event)"
              name="files"
              class="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
            />
            @if (selectedFiles().length > 0) {
              <span class="text-xs text-neutral-500">Обрано: {{ selectedFiles().length }}</span>
            }
            @if (rejectedCount() > 0) {
              <span class="text-xs text-red-600">Пропущено непідтримуваних: {{ rejectedCount() }}</span>
            }
          </label>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
          <button
            type="button"
            (click)="close()"
            class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            Скасувати
          </button>
          <button
            type="submit"
            [disabled]="!canSubmit()"
            class="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
          >
            @if (store.saving()) { Зберігаємо… } @else { Зберегти }
          </button>
        </footer>
      </form>
    </dialog>
  `,
})
export class AddAttemptDialogComponent {
  protected readonly store = inject(ElementStore);
  private readonly toasts = inject(ToastService);

  protected readonly accept = ACCEPT;
  protected readonly date = signal<string>(todayIso());
  protected readonly note = signal<string>('');
  protected readonly selectedFiles = signal<readonly File[]>([]);
  protected readonly rejectedCount = signal<number>(0);

  protected readonly canSubmit = computed(
    () => !this.store.saving() && this.date().length > 0,
  );

  @Output() readonly created = new EventEmitter<string>();

  @ViewChild('dlg', { static: true }) private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  open(): void {
    this.reset();
    const dlg = this.dialogRef.nativeElement;
    if (!dlg.open) dlg.showModal();
  }

  close(): void {
    const dlg = this.dialogRef.nativeElement;
    if (dlg.open) dlg.close();
  }

  protected onClose(): void {
    this.reset();
  }

  protected onFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const files = target?.files ? Array.from(target.files) : [];
    const accepted: File[] = [];
    let rejected = 0;
    for (const file of files) {
      if (isAllowedFile(file)) {
        accepted.push(file);
      } else {
        rejected += 1;
      }
    }
    this.selectedFiles.set(accepted);
    this.rejectedCount.set(rejected);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) return;

    const elementId = this.store.element()?.id;
    if (!elementId) return;

    try {
      const attempt = await this.store.createAttempt(
        {
          elementId,
          date: this.date(),
          note: this.note().trim() || null,
        },
        [...this.selectedFiles()],
      );
      this.toasts.success('Спробу додано');
      this.created.emit(attempt.id);
      this.close();
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося зберегти спробу');
    }
  }

  private reset(): void {
    this.date.set(todayIso());
    this.note.set('');
    this.selectedFiles.set([]);
    this.rejectedCount.set(0);
  }
}
