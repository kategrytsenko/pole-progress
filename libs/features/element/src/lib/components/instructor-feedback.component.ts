import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { AttemptInstructorFeedback } from '@org/data';

@Component({
  selector: 'pp-instructor-feedback',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
      aria-label="Коментар інструктора"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
        >
          Інструктор
        </span>
        @if (feedback.author_name) {
          <span class="text-xs font-semibold text-amber-950">{{ feedback.author_name }}</span>
        }
        <time [attr.datetime]="feedback.updated_at" class="text-xs text-amber-800/80">
          {{ feedback.updated_at | date: 'dd.MM.yyyy' }}
        </time>
      </div>
      <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-950">{{ feedback.body }}</p>
    </aside>
  `,
})
export class InstructorFeedbackComponent {
  @Input({ required: true }) feedback!: AttemptInstructorFeedback;
}
