import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DashboardStore } from '@org/dashboard';
import { ToastService } from '@org/shell';
import { AddAttemptDialogComponent } from '../components/add-attempt-dialog.component';
import { ElementStore } from '../element.store';

@Component({
  selector: 'pp-element',
  imports: [DatePipe, RouterLink, AddAttemptDialogComponent],
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
        До каталогу
      </a>

      @if (store.loading()) {
        <p class="text-sm text-neutral-500">Завантаження…</p>
      } @else if (store.error(); as error) {
        <p role="alert" class="text-sm text-red-600">{{ error }}</p>
      } @else if (store.element(); as element) {
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-semibold tracking-tight">{{ element.name }}</h1>
            @if (store.isDone()) {
              <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3" aria-hidden="true">
                  <path fill-rule="evenodd" d="M16.704 5.296a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414L8.5 12.086l6.79-6.79a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Виконано
              </span>
            }
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

        @if (element.image_url) {
          <figure class="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            <img
              [src]="element.image_url"
              [alt]="element.name"
              class="h-72 w-full object-cover sm:h-96"
            />
          </figure>
        }

        <section aria-label="Спроби" class="space-y-3">
          <h2 class="text-lg font-semibold tracking-tight">Спроби ({{ store.attemptsList().length }})</h2>

          @if (store.attemptsList().length === 0) {
            <p class="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500">
              Поки що немає жодної спроби. Натисни «Додати спробу», щоб почати.
            </p>
          } @else {
            <ol class="space-y-3">
              @for (attempt of store.attemptsList(); track attempt.id) {
                <li class="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-neutral-800">
                        {{ attempt.date | date: 'dd.MM.yyyy' }}
                      </p>
                      @if (attempt.note) {
                        <p class="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{{ attempt.note }}</p>
                      }
                    </div>
                    <button
                      type="button"
                      (click)="onDeleteAttempt(attempt.id)"
                      aria-label="Видалити спробу"
                      class="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-1 1v1H5a1 1 0 100 2h10a1 1 0 100-2h-3V3a1 1 0 00-1-1H9zM6 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm5 0a1 1 0 00-1 1v6a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  @if (store.mediaForAttempt(attempt.id).length > 0) {
                    <ul class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      @for (item of store.mediaForAttempt(attempt.id); track item.id) {
                        <li class="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                          @if (!item.signedUrl) {
                            <div class="flex aspect-square items-center justify-center text-xs text-neutral-400">
                              Недоступно
                            </div>
                          } @else if (item.type === 'image') {
                            <img
                              [src]="item.signedUrl"
                              alt=""
                              loading="lazy"
                              class="aspect-square h-full w-full object-cover"
                            />
                          } @else {
                            <video
                              [src]="item.signedUrl"
                              controls
                              preload="metadata"
                              class="aspect-square h-full w-full object-cover"
                            ></video>
                          }
                        </li>
                      }
                    </ul>
                  }
                </li>
              }
            </ol>
          }
        </section>

        <pp-add-attempt-dialog #dialog (created)="onAttemptCreated()" />
      } @else {
        <p class="text-sm text-neutral-500">Елемент не знайдено.</p>
      }
    </section>
  `,
})
export class ElementPage implements OnInit {
  @Input({ required: true }) id!: string;

  protected readonly store = inject(ElementStore);
  private readonly dashboard = inject(DashboardStore);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  @ViewChild('dialog') private dialog?: AddAttemptDialogComponent;

  ngOnInit(): void {
    void this.store.load(this.id);
  }

  protected onAddAttempt(): void {
    this.dialog?.open();
  }

  protected onAttemptCreated(): void {
    this.dashboard.markDone(this.id);
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

  protected back(): Promise<boolean> {
    return this.router.navigateByUrl('/app');
  }
}
