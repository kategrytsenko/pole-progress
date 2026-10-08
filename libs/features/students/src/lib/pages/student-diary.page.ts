import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  inject,
  type SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ATTEMPT_STAGE_LABELS,
  ATTEMPT_STAGE_PILL_CLASS,
  ATTEMPT_STAGE_RING_CLASS,
  ATTEMPT_STAGES,
  type AttemptStage,
} from '@org/data';
import { StateBlockComponent } from '@org/shell';
import { StudentDiaryStore, type StudentRecordFilter } from '../student-diary.store';

interface FilterOption {
  readonly id: StudentRecordFilter;
  readonly label: string;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  { id: 'all', label: 'Усі' },
  { id: 'withRecords', label: 'З записами' },
  { id: 'withoutRecords', label: 'Без записів' },
];

@Component({
  selector: 'pp-student-diary',
  imports: [RouterLink, StateBlockComponent],
  providers: [StudentDiaryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <a
        routerLink="/app/students"
        class="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-primary"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
          <path fill-rule="evenodd" d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        До списку учнів
      </a>

      @if (store.loading()) {
        <pp-state-block mode="loading" />
      } @else if (store.error(); as error) {
        <pp-state-block mode="error" [message]="error" />
      } @else {
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">Щоденник учня</p>
            <h1 class="mt-1 text-2xl font-semibold tracking-tight">{{ store.studentName() }}</h1>
            <p class="mt-1 text-sm text-neutral-600">
              {{ store.recordedCount() }} з {{ store.totalCount() }} елементів з записами.
              Поточний етап — це остання спроба за датою.
            </p>
          </div>

          <div class="flex w-full max-w-sm items-center gap-2 sm:w-auto">
            <label class="sr-only" for="student-diary-search">Пошук елементів</label>
            <input
              id="student-diary-search"
              type="search"
              inputmode="search"
              autocomplete="off"
              placeholder="Пошук…"
              [value]="store.query()"
              (input)="onSearchInput($event)"
              class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </header>

        <ul aria-label="Скільки елементів на кожному етапі" class="flex flex-wrap gap-2">
          @for (stage of stages; track stage) {
            <li [class]="'rounded-full px-2.5 py-1 text-xs font-semibold ' + stagePillClass(stage)">
              {{ stageLabel(stage) }}
              <span class="ml-1 tabular-nums">{{ store.stageCounts()[stage] }}</span>
            </li>
          }
        </ul>

        <div role="tablist" aria-label="Фільтр записів" class="flex flex-wrap gap-2">
          @for (option of filterOptions; track option.id) {
            <button
              role="tab"
              type="button"
              [attr.aria-selected]="store.filter() === option.id"
              (click)="onFilterChange(option.id)"
              [class]="filterPillClass(store.filter() === option.id)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        @if (store.categories().length > 0) {
          <div aria-label="Категорії" class="flex flex-wrap gap-2">
            <button
              type="button"
              (click)="onCategorySelect(null)"
              [class]="categoryButtonClass(store.selectedCategoryId() === null)"
            >
              Усі категорії
            </button>
            @for (category of store.categories(); track category.id) {
              <button
                type="button"
                (click)="onCategorySelect(category.id)"
                [class]="categoryButtonClass(store.selectedCategoryId() === category.id)"
              >
                {{ category.name }}
              </button>
            }
          </div>
        }

        @if (store.filteredElements().length === 0) {
          <pp-state-block mode="empty" message="Нічого не знайдено за поточним фільтром." />
        } @else {
          <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            @for (element of store.filteredElements(); track element.id) {
              <li>
                <a
                  [routerLink]="['/app/students', studentId, 'elements', element.id]"
                  class="group block rounded-xl border border-neutral-200 bg-white p-2 shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <div [class]="thumbClass(element.id)">
                    @if (element.image_url) {
                      <img
                        [src]="element.image_url"
                        [alt]="element.name"
                        loading="lazy"
                        class="h-full w-full object-cover"
                      />
                    } @else {
                      <div class="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                        Без фото
                      </div>
                    }
                  </div>
                  <p class="mt-2 truncate text-sm font-medium text-neutral-800 group-hover:text-primary">
                    {{ element.name }}
                  </p>
                  @if (store.stageOf(element.id); as stage) {
                    <span [class]="'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ' + stagePillClass(stage)">
                      {{ stageLabel(stage) }}
                    </span>
                  }
                </a>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class StudentDiaryPage implements OnChanges {
  @Input({ required: true }) studentId!: string;

  protected readonly store = inject(StudentDiaryStore);
  protected readonly filterOptions = FILTER_OPTIONS;
  protected readonly stages = ATTEMPT_STAGES;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['studentId']) return;
    void this.store.load(this.studentId);
  }

  protected onCategorySelect(id: string | null): void {
    this.store.setSelectedCategory(id);
  }

  protected onFilterChange(filter: StudentRecordFilter): void {
    this.store.setFilter(filter);
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    this.store.setQuery(target.value);
  }

  protected filterPillClass(active: boolean): string {
    const base =
      'rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30';
    return active
      ? `${base} border-primary bg-primary text-white`
      : `${base} border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary`;
  }

  protected stageLabel(stage: AttemptStage): string {
    return ATTEMPT_STAGE_LABELS[stage];
  }

  protected stagePillClass(stage: AttemptStage): string {
    return ATTEMPT_STAGE_PILL_CLASS[stage];
  }

  protected thumbClass(elementId: string): string {
    const base = 'relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100';
    const stage = this.store.stageOf(elementId);
    if (!stage) return base;
    return `${base} ring-2 ${ATTEMPT_STAGE_RING_CLASS[stage]}`;
  }

  protected categoryButtonClass(active: boolean): string {
    const base =
      'rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30';
    return active
      ? `${base} border-primary bg-primary/10 text-primary`
      : `${base} border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary`;
  }
}
