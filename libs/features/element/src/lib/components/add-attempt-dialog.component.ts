import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import {
  ATTEMPT_STAGE_HINTS,
  ATTEMPT_STAGE_LABELS,
  ATTEMPT_STAGE_MARK_CLASS,
  ATTEMPT_STAGES,
  type AttemptStage,
  type ElementAttempt,
} from '@org/data';
import { ToastService } from '@org/shell';
import { ElementStore, type MediaItemView } from '../element.store';
import { InstructorFeedbackComponent } from './instructor-feedback.component';

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
  imports: [FormsModule, InstructorFeedbackComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dlg
      (close)="onClose()"
      class="w-[min(520px,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <form method="dialog" (submit)="onSubmit($event)" class="flex flex-col">
        <header class="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 class="text-base font-semibold">{{ dialogTitle() }}</h2>
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

        <div class="flex max-h-[min(70vh,36rem)] flex-col gap-4 overflow-y-auto px-5 py-4">
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

          <fieldset class="flex flex-col gap-2">
            <legend class="text-sm font-medium text-neutral-800">Етап</legend>
            <div class="grid grid-cols-2 gap-2">
              @for (option of stages; track option) {
                <label [class]="stageOptionClass(stage() === option)">
                  <input
                    type="radio"
                    name="stage"
                    class="sr-only"
                    [value]="option"
                    [checked]="stage() === option"
                    (change)="stage.set(option)"
                  />
                  <span [class]="'h-2 w-2 shrink-0 rounded-full ' + markClass(option)" aria-hidden="true"></span>
                  <span>{{ label(option) }}</span>
                </label>
              }
            </div>
            <p class="text-xs text-neutral-500">{{ hint(stage()) }}</p>
          </fieldset>

          @if (instructorFeedback(); as feedback) {
            <pp-instructor-feedback class="block" [feedback]="feedback" />
          }

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

          @if (isEditing()) {
            <section class="flex flex-col gap-2" aria-label="Вже завантажені файли">
              <h3 class="text-sm font-medium text-neutral-800">Вже завантажені файли</h3>
              @if (existingMedia().length === 0) {
                <p class="text-xs text-neutral-500">До цієї спроби ще не додано фото чи відео.</p>
              } @else {
                <ul class="grid grid-cols-3 gap-2">
                  @for (item of existingMedia(); track item.id) {
                    <li class="relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                      @if (!item.signedUrl) {
                        <div class="flex aspect-square items-center justify-center px-2 text-center text-[11px] text-neutral-400">
                          Недоступно
                        </div>
                      } @else if (item.type === 'image') {
                        <img
                          [src]="item.signedUrl"
                          alt=""
                          class="aspect-square w-full object-cover"
                        />
                      } @else {
                        <video
                          [src]="item.signedUrl"
                          muted
                          playsinline
                          preload="metadata"
                          class="aspect-square w-full bg-neutral-950 object-cover"
                        ></video>
                        <span class="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Відео
                        </span>
                      }
                      <button
                        type="button"
                        (click)="onRemoveMedia(item)"
                        [disabled]="store.saving() || removingMediaId() !== null"
                        aria-label="Видалити файл"
                        class="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-neutral-600 shadow-sm transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>
          }

          <div class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-800">Додати нові файли</span>
            <span class="text-xs font-normal text-neutral-500">
              @if (isEditing()) {
                Поле вибору завжди порожнє: браузер не показує вже збережені файли. Оберіть лише нові — вони додадуться після збереження.
              } @else {
                jpg, png, webp, mp4
              }
            </span>
            <input
              #fileInput
              type="file"
              multiple
              [accept]="accept"
              [disabled]="store.saving() || removingMediaId() !== null"
              (change)="onFilesSelected($event)"
              name="files"
              class="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            />
            @if (selectedFiles().length > 0) {
              <ul class="text-xs text-neutral-600">
                @for (file of selectedFiles(); track $index) {
                  <li>{{ file.name }}</li>
                }
              </ul>
            }
            @if (rejectedCount() > 0) {
              <span class="text-xs text-red-600">Пропущено непідтримуваних: {{ rejectedCount() }}</span>
            }
          </div>
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
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected readonly accept = ACCEPT;
  protected readonly stages = ATTEMPT_STAGES;
  protected readonly date = signal<string>(todayIso());
  protected readonly stage = signal<AttemptStage>('trying');
  protected readonly note = signal<string>('');
  protected readonly selectedFiles = signal<readonly File[]>([]);
  protected readonly rejectedCount = signal<number>(0);
  protected readonly removingMediaId = signal<string | null>(null);
  private readonly editingAttempt = signal<ElementAttempt | null>(null);

  protected readonly isEditing = computed(() => this.editingAttempt() !== null);
  protected readonly instructorFeedback = computed(
    () => this.editingAttempt()?.instructor_feedback ?? null,
  );
  protected readonly existingMedia = computed<readonly MediaItemView[]>(() => {
    const attemptId = this.editingAttempt()?.id;
    if (!attemptId) return [];
    return this.store.mediaFor(attemptId);
  });
  protected readonly dialogTitle = computed(() =>
    this.isEditing() ? 'Редагувати спробу' : 'Додати спробу',
  );
  protected readonly canSubmit = computed(
    () =>
      !this.store.saving() && this.removingMediaId() === null && this.date().length > 0,
  );

  @Output() readonly created = new EventEmitter<ElementAttempt>();
  @Output() readonly updated = new EventEmitter<ElementAttempt>();

  @ViewChild('dlg', { static: true }) private readonly dialogRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  open(): void {
    this.reset();
    const latest = this.store.latestStage();
    if (latest) this.stage.set(latest);
    this.show();
  }

  openForEdit(attempt: ElementAttempt): void {
    this.reset();
    this.editingAttempt.set(attempt);
    this.date.set(attempt.date.slice(0, 10));
    this.stage.set(attempt.stage);
    this.note.set(attempt.note ?? '');
    this.show();
  }

  close(): void {
    const dlg = this.dialogRef.nativeElement;
    if (dlg.open) dlg.close();
  }

  protected onClose(): void {
    this.reset();
  }

  protected async onRemoveMedia(item: MediaItemView): Promise<void> {
    const attempt = this.editingAttempt();
    if (!attempt || this.removingMediaId() !== null || this.store.saving()) return;
    if (typeof window !== 'undefined' && !window.confirm('Видалити цей файл зі спроби?')) {
      return;
    }

    this.removingMediaId.set(item.id);
    try {
      await this.store.deleteMedia(attempt.id, item.id);
      this.toasts.success('Файл видалено');
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося видалити файл');
    } finally {
      this.removingMediaId.set(null);
    }
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

    const editing = this.editingAttempt();
    const note = this.note().trim() || null;

    try {
      if (editing) {
        const attempt = await this.store.updateAttempt(
          {
            id: editing.id,
            date: this.date(),
            note,
            stage: this.stage(),
          },
          [...this.selectedFiles()],
        );
        this.toasts.success('Спробу оновлено');
        this.updated.emit(attempt);
      } else {
        const elementId = this.store.element()?.id;
        if (!elementId) return;

        const attempt = await this.store.createAttempt(
          {
            elementId,
            date: this.date(),
            note,
            stage: this.stage(),
          },
          [...this.selectedFiles()],
        );
        this.toasts.success('Спробу додано');
        this.created.emit(attempt);
      }
      this.close();
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося зберегти спробу');
    }
  }

  protected label(stage: AttemptStage): string {
    return ATTEMPT_STAGE_LABELS[stage];
  }

  protected hint(stage: AttemptStage): string {
    return ATTEMPT_STAGE_HINTS[stage];
  }

  protected markClass(stage: AttemptStage): string {
    return ATTEMPT_STAGE_MARK_CLASS[stage];
  }

  protected stageOptionClass(selected: boolean): string {
    const base =
      'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition';
    return selected
      ? `${base} border-primary bg-primary/10 text-primary ring-2 ring-primary/20`
      : `${base} border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300`;
  }

  private show(): void {
    this.changeDetector.detectChanges();
    const dlg = this.dialogRef.nativeElement;
    if (!dlg.open) dlg.showModal();
  }

  private reset(): void {
    this.editingAttempt.set(null);
    this.date.set(todayIso());
    this.stage.set('trying');
    this.note.set('');
    this.selectedFiles.set([]);
    this.rejectedCount.set(0);
    this.removingMediaId.set(null);
    const input = this.fileInput?.nativeElement;
    if (input) input.value = '';
  }
}
