import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
  type SimpleChanges,
} from '@angular/core';
import type { AttemptInstructorFeedback } from '@org/data';

const MAX_NOTE_LENGTH = 2000;

@Component({
  selector: 'pp-instructor-note-form',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
      (submit)="onSubmit($event)"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
        >
          Інструктор
        </span>
        @if (feedback?.author_name; as author) {
          <span class="text-xs font-semibold text-amber-950">{{ author }}</span>
        }
        @if (feedback; as note) {
          <time [attr.datetime]="note.updated_at" class="text-xs text-amber-800/80">
            {{ note.updated_at | date: 'dd.MM.yyyy' }}
          </time>
        }
      </div>

      <label class="sr-only" [attr.for]="fieldId">Коментар інструктора</label>
      <textarea
        [id]="fieldId"
        rows="3"
        [attr.maxlength]="maxLength"
        [disabled]="saving"
        [value]="draft()"
        (input)="onDraftInput($event)"
        [placeholder]="feedback ? 'Оновити коментар' : 'Коментар до цієї спроби'"
        class="mt-2 w-full resize-y rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      ></textarea>

      <div class="mt-2 flex justify-end">
        <button
          type="submit"
          [disabled]="!canSubmit()"
          class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ saving ? 'Збереження…' : feedback ? 'Оновити коментар' : 'Зберегти коментар' }}
        </button>
      </div>
    </form>
  `,
})
export class InstructorNoteFormComponent implements OnChanges {
  @Input({ required: true }) attemptId!: string;
  @Input() feedback: AttemptInstructorFeedback | null = null;
  @Input() saving = false;
  @Output() readonly saveNote = new EventEmitter<string>();

  protected readonly maxLength = MAX_NOTE_LENGTH;
  protected readonly draft = signal('');

  protected get fieldId(): string {
    return `instructor-note-${this.attemptId}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['feedback']) {
      this.draft.set(this.feedback?.body ?? '');
    }
  }

  protected canSubmit(): boolean {
    if (this.saving) return false;
    const body = this.draft().trim();
    if (body.length === 0 || body.length > MAX_NOTE_LENGTH) return false;
    return body !== (this.feedback?.body ?? '');
  }

  protected onDraftInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.draft.set(target?.value ?? '');
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) return;
    this.saveNote.emit(this.draft().trim());
  }
}
