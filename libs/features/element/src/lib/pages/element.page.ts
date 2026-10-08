import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ATTEMPT_STAGE_LABELS,
  ATTEMPT_STAGE_MARK_CLASS,
  ATTEMPT_STAGE_PILL_CLASS,
  ATTEMPT_STAGES,
  type AttemptStage,
  type ElementAttempt,
  stageRank,
} from '@org/data';
import { DashboardStore } from '@org/dashboard';
import { StateBlockComponent, ToastService } from '@org/shell';
import { AddAttemptDialogComponent } from '../components/add-attempt-dialog.component';
import { ElementStore, type MediaItemView } from '../element.store';

type StepState = 'current' | 'reached' | 'upcoming';

@Component({
  selector: 'pp-element',
  imports: [DatePipe, RouterLink, AddAttemptDialogComponent, StateBlockComponent],
  providers: [ElementStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <a
        routerLink="/app"
        class="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-primary"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
          <path fill-rule="evenodd" d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        До щоденника
      </a>

      @if (store.loading()) {
        <pp-state-block mode="loading" />
      } @else if (store.error(); as error) {
        <pp-state-block mode="error" [message]="error" />
      } @else if (store.element(); as element) {
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">Щоденник</p>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-semibold tracking-tight">{{ element.name }}</h1>
              @if (store.latestStage(); as stage) {
                <span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' + pillClass(stage)">
                  {{ label(stage) }}
                </span>
              }
            </div>
          </div>

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
              message="Поки що немає жодної спроби. Натисни «Додати спробу», щоб почати щоденник цього елемента."
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
                  </article>
                </li>
              }
            </ol>
          }
        </section>

        <pp-add-attempt-dialog #dialog (created)="onAttemptCreated($event)" />
      } @else {
        <pp-state-block mode="empty" message="Елемент не знайдено." />
      }
    </section>
  `,
})
export class ElementPage implements OnInit {
  @Input({ required: true }) id!: string;

  protected readonly store = inject(ElementStore);
  protected readonly stages = ATTEMPT_STAGES;
  private readonly dashboard = inject(DashboardStore);
  private readonly toasts = inject(ToastService);

  @ViewChild('dialog') private dialog?: AddAttemptDialogComponent;

  ngOnInit(): void {
    void this.store.load(this.id);
  }

  protected onAddAttempt(): void {
    this.dialog?.open();
  }

  protected onAttemptCreated(attempt: ElementAttempt): void {
    this.dashboard.recordAttempt(attempt);
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
