import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '@org/auth';
import {
  ATTEMPT_STAGE_LABELS,
  ATTEMPT_STAGE_MARK_CLASS,
  ATTEMPT_STAGE_PILL_CLASS,
  ATTEMPT_STAGES,
  type AttemptStage,
  type ElementAttempt,
  stageRank,
  studentLabel,
} from '@org/data';
import { DashboardStore } from '@org/dashboard';
import { StateBlockComponent, ToastService } from '@org/shell';
import { AddAttemptDialogComponent } from '../components/add-attempt-dialog.component';
import { AttemptReactionsComponent } from '../components/attempt-reactions.component';
import { InstructorFeedbackComponent } from '../components/instructor-feedback.component';
import { InstructorNoteFormComponent } from '../components/instructor-note-form.component';
import { ElementStore, type MediaItemView } from '../element.store';

type DiaryView = 'own' | 'staff' | 'journal';

type StepState = 'current' | 'reached' | 'upcoming';

@Component({
  selector: 'pp-element',
  imports: [
    DatePipe,
    RouterLink,
    AddAttemptDialogComponent,
    AttemptReactionsComponent,
    InstructorFeedbackComponent,
    InstructorNoteFormComponent,
    StateBlockComponent,
  ],
  providers: [ElementStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <a
        [routerLink]="backLink"
        class="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-primary"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
          <path fill-rule="evenodd" d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        {{ backLabel }}
      </a>

      @if (store.loading()) {
        <pp-state-block mode="loading" />
      } @else if (store.error(); as error) {
        <pp-state-block mode="error" [message]="error" />
      } @else if (store.unavailable()) {
        <pp-state-block mode="empty" message="Цей щоденник приватний." />
      } @else if (store.element(); as element) {
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">
              {{ eyebrow }}
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-semibold tracking-tight">{{ element.name }}</h1>
              @if (store.latestStage(); as stage) {
                <span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' + pillClass(stage)">
                  {{ label(stage) }}
                </span>
              }
            </div>
          </div>

          @if (showInstructorForm) {
            <p class="max-w-sm text-sm text-neutral-600">
              Спроби змінює учень. Коментар інструктора можна додати до кожного запису.
            </p>
          } @else if (canEditAttempts) {
            <button
              type="button"
              (click)="onAddAttempt()"
              class="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Додати спробу
            </button>
          }
        </header>

        @if (store.latestStage(); as latest) {
          <ol aria-label="Поточний етап" class="grid grid-cols-4 gap-2">
            @for (stage of stages; track stage) {
              <li [class]="stepClass(stepState(stage, latest))">
                <span [class]="stepBarClass(stage, latest)"></span>
                <span class="text-[11px] font-semibold leading-tight sm:text-xs">{{ label(stage) }}</span>
              </li>
            }
          </ol>
        }

        @if (element.image_url) {
          <figure class="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            <img
              [src]="element.image_url"
              [alt]="element.name"
              class="h-72 w-full object-cover sm:h-96"
            />
          </figure>
        }

        <section aria-label="Хронологія спроб" class="space-y-4">
          <div>
            <h2 class="text-lg font-semibold tracking-tight">Хронологія</h2>
            <p class="mt-1 text-sm text-neutral-600">
              {{ store.timeline().length }}
              {{ attemptWord(store.timeline().length) }} — від першого запису до останнього.
            </p>
          </div>

          @if (store.timeline().length === 0) {
            <pp-state-block
              mode="empty"
              [message]="emptyAttemptsMessage"
            />
          } @else {
            <ol class="relative space-y-6 border-l-2 border-neutral-200 pl-6">
              @for (entry of store.timeline(); track entry.attempt.id) {
                <li class="relative">
                  <span
                    class="absolute -left-[1.95rem] top-4 h-3.5 w-3.5 rounded-full ring-4 ring-neutral-50"
                    [class]="markClass(entry.attempt.stage)"
                    aria-hidden="true"
                  ></span>

                  <article class="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <header class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <time
                          [attr.datetime]="entry.attempt.date"
                          class="text-sm font-semibold text-neutral-900"
                        >
                          {{ entry.attempt.date | date: 'dd.MM.yyyy' }}
                        </time>
                        <span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' + pillClass(entry.attempt.stage)">
                          {{ label(entry.attempt.stage) }}
                        </span>
                      </div>
                      @if (canEditAttempts) {
                        <div class="flex items-center">
                          <button
                            type="button"
                            (click)="onEditAttempt(entry.attempt)"
                            aria-label="Редагувати спробу"
                            class="rounded p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            (click)="onDeleteAttempt(entry.attempt.id)"
                            aria-label="Видалити спробу"
                            class="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                              <path fill-rule="evenodd" d="M9 2a1 1 0 00-1 1v1H5a1 1 0 100 2h10a1 1 0 100-2h-3V3a1 1 0 00-1-1H9zM6 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm5 0a1 1 0 00-1 1v6a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      }
                    </header>

                    @if (entry.previousStage === null) {
                      <p class="mt-2 text-xs font-medium text-neutral-500">Перший запис</p>
                    } @else if (entry.direction === 'forward') {
                      <p class="mt-2 text-xs font-semibold text-primary">
                        {{ label(entry.previousStage) }} → {{ label(entry.attempt.stage) }}
                      </p>
                    } @else if (entry.direction === 'back') {
                      <p class="mt-2 text-xs font-semibold text-amber-800">
                        Повернення: {{ label(entry.previousStage) }} → {{ label(entry.attempt.stage) }}
                      </p>
                    }

                    @if (entry.attempt.note) {
                      <p class="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{{ entry.attempt.note }}</p>
                    }

                    @if (showInstructorForm) {
                      <pp-instructor-note-form
                        class="mt-3 block"
                        [attemptId]="entry.attempt.id"
                        [feedback]="entry.attempt.instructor_feedback"
                        [saving]="store.savingFeedbackId() === entry.attempt.id"
                        (saveNote)="onSaveFeedback(entry.attempt.id, $event)"
                      />
                    } @else if (canEditAttempts && entry.attempt.instructor_feedback; as feedback) {
                      <pp-instructor-feedback class="mt-3 block" [feedback]="feedback" />
                    }

                    <p class="mt-3 text-xs text-neutral-500">{{ mediaSummary(entry.media) }}</p>

                    @if (entry.media.length > 0) {
                      <ul class="mt-3 space-y-3">
                        @for (item of entry.media; track item.id) {
                          <li class="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950">
                            @if (!item.signedUrl) {
                              <div class="flex aspect-video items-center justify-center bg-neutral-100 text-xs text-neutral-400">
                                Недоступно
                              </div>
                            } @else if (item.type === 'image') {
                              <img
                                [src]="item.signedUrl"
                                alt=""
                                loading="lazy"
                                class="max-h-[28rem] w-full bg-neutral-100 object-contain"
                              />
                            } @else {
                              <video
                                [src]="item.signedUrl"
                                controls
                                playsinline
                                preload="metadata"
                                class="max-h-[28rem] w-full bg-black object-contain"
                              ></video>
                            }
                          </li>
                        }
                      </ul>
                    }

                    <pp-attempt-reactions
                      [attemptId]="entry.attempt.id"
                      [attemptOwnerId]="entry.attempt.user_id"
                      [viewerId]="viewerId"
                      [journalPublic]="store.journalPublic()"
                      [hasStudioAccess]="auth.hasStudioAccess()"
                      [likes]="store.likesFor(entry.attempt.id)"
                      [comments]="store.commentsFor(entry.attempt.id)"
                      [busy]="store.savingLikeId() === entry.attempt.id || store.savingCommentAttemptId() === entry.attempt.id"
                      (toggleLike)="onToggleLike(entry.attempt.id)"
                      (addComment)="onAddComment(entry.attempt.id, $event)"
                      (updateComment)="onUpdateComment(entry.attempt.id, $event)"
                      (deleteComment)="onDeleteComment(entry.attempt.id, $event)"
                    />
                  </article>
                </li>
              }
            </ol>
          }
        </section>

        @if (canEditAttempts) {
          <pp-add-attempt-dialog
            #dialog
            (created)="onAttemptCreated($event)"
            (updated)="onAttemptUpdated()"
          />
        }
      } @else {
        <pp-state-block mode="empty" message="Елемент не знайдено." />
      }
    </section>
  `,
})
export class ElementPage implements OnInit {
  @Input({ required: true }) id!: string;

  protected readonly store = inject(ElementStore);
  protected readonly auth = inject(AuthStore);
  protected readonly stages = ATTEMPT_STAGES;
  protected viewerId: string | null = null;
  protected diary: DiaryView = 'own';
  protected canEditAttempts = true;
  protected showInstructorForm = false;
  protected backLink: string | readonly string[] = '/app';
  protected backLabel = 'До щоденника';
  private readonly dashboard = inject(DashboardStore);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('dialog') private dialog?: AddAttemptDialogComponent;

  protected get eyebrow(): string {
    if (this.diary === 'own') return 'Щоденник';
    const prefix = this.diary === 'journal' ? 'Публічний щоденник' : 'Щоденник';
    return `${prefix} · ${studentLabel(this.store.studentName())}`;
  }

  protected get emptyAttemptsMessage(): string {
    if (this.canEditAttempts) {
      return 'Поки що немає жодної спроби. Натисни «Додати спробу», щоб почати щоденник цього елемента.';
    }
    if (this.diary === 'journal') return 'У цьому щоденнику ще немає спроб цього елемента.';
    return 'У цього учня ще немає спроб цього елемента.';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.applyRoute();
      const elementId = this.route.snapshot.paramMap.get('id') ?? this.id;
      const studentId = this.diary === 'own' ? null : this.studentIdFromRoute();
      void this.store.load(elementId, studentId, {
        requirePublicJournal: this.diary === 'journal',
      });
    });
  }

  protected async onToggleLike(attemptId: string): Promise<void> {
    try {
      await this.store.toggleLike(attemptId);
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося оновити вподобання');
    }
  }

  protected async onAddComment(attemptId: string, body: string): Promise<void> {
    try {
      await this.store.addComment(attemptId, body);
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося додати коментар');
    }
  }

  protected async onUpdateComment(
    attemptId: string,
    change: { id: string; body: string },
  ): Promise<void> {
    try {
      await this.store.updateComment(attemptId, change.id, change.body);
      this.toasts.success('Коментар збережено');
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося зберегти коментар');
    }
  }

  protected async onDeleteComment(attemptId: string, commentId: string): Promise<void> {
    try {
      await this.store.deleteComment(attemptId, commentId);
      this.toasts.success('Коментар видалено');
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося видалити коментар');
    }
  }

  protected async onSaveFeedback(attemptId: string, body: string): Promise<void> {
    try {
      await this.store.saveInstructorFeedback(attemptId, body);
      this.toasts.success('Коментар збережено');
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося зберегти коментар');
    }
  }

  private applyRoute(): void {
    this.diary = this.diaryFromRoute();
    const studentId = this.diary === 'own' ? null : this.studentIdFromRoute();
    this.viewerId = this.auth.user()?.id ?? null;
    this.canEditAttempts =
      this.diary === 'own' || (this.viewerId !== null && studentId === this.viewerId);
    this.showInstructorForm = this.auth.isStaff() && !this.canEditAttempts;

    if (this.diary === 'staff' && studentId) {
      this.backLink = ['/app/students', studentId];
      this.backLabel = 'До щоденника учня';
      return;
    }

    if (this.diary === 'journal' && studentId) {
      this.backLink = ['/app/journals', studentId];
      this.backLabel = 'До щоденника';
      return;
    }

    this.backLink = '/app';
    this.backLabel = 'До щоденника';
  }

  private diaryFromRoute(): DiaryView {
    let current: ActivatedRoute | null = this.route;
    while (current) {
      const diary = current.snapshot.data['diary'];
      if (diary === 'staff' || diary === 'journal' || diary === 'own') return diary;
      current = current.parent;
    }
    return 'own';
  }

  private studentIdFromRoute(): string | null {
    let current: ActivatedRoute | null = this.route;
    while (current) {
      const studentId = current.snapshot.paramMap.get('studentId')?.trim();
      if (studentId) return studentId;
      current = current.parent;
    }
    return null;
  }

  protected onAddAttempt(): void {
    this.dialog?.open();
  }

  protected onEditAttempt(attempt: ElementAttempt): void {
    this.dialog?.openForEdit(attempt);
  }

  protected onAttemptCreated(attempt: ElementAttempt): void {
    this.dashboard.recordAttempt(attempt);
  }

  protected onAttemptUpdated(): void {
    this.dashboard.replaceElementProgress(
      this.store.timeline().map((entry) => entry.attempt),
    );
  }

  protected async onDeleteAttempt(attemptId: string): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm('Видалити цю спробу?')) {
      return;
    }
    try {
      await this.store.deleteAttempt(attemptId);
      this.toasts.success('Спробу видалено');
    } catch (err: unknown) {
      this.toasts.error(err instanceof Error ? err.message : 'Не вдалося видалити спробу');
    }
  }

  protected label(stage: AttemptStage): string {
    return ATTEMPT_STAGE_LABELS[stage];
  }

  protected pillClass(stage: AttemptStage): string {
    return ATTEMPT_STAGE_PILL_CLASS[stage];
  }

  protected markClass(stage: AttemptStage): string {
    return ATTEMPT_STAGE_MARK_CLASS[stage];
  }

  protected stepState(stage: AttemptStage, latest: AttemptStage): StepState {
    if (stage === latest) return 'current';
    return stageRank(stage) < stageRank(latest) ? 'reached' : 'upcoming';
  }

  protected stepClass(state: StepState): string {
    const tone =
      state === 'current' ? 'text-neutral-900' : state === 'reached' ? 'text-neutral-600' : 'text-neutral-400';
    return `flex flex-col gap-1 ${tone}`;
  }

  protected stepBarClass(stage: AttemptStage, latest: AttemptStage): string {
    if (this.stepState(stage, latest) === 'upcoming') return 'h-1.5 rounded-full bg-neutral-200';
    return `h-1.5 rounded-full ${ATTEMPT_STAGE_MARK_CLASS[stage]}`;
  }

  protected attemptWord(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'запис';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'записи';
    return 'записів';
  }

  protected mediaSummary(media: readonly MediaItemView[]): string {
    let images = 0;
    let videos = 0;
    for (const item of media) {
      if (item.type === 'video') videos += 1;
      else images += 1;
    }
    return mediaCaption(images, videos);
  }
}

function mediaCaption(images: number, videos: number): string {
  const parts: string[] = [];
  if (images > 0) parts.push(`${images} фото`);
  if (videos > 0) parts.push(`${videos} відео`);
  return parts.length > 0 ? parts.join(' · ') : 'Без фото чи відео';
}
