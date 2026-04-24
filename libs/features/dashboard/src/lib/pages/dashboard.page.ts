import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardStore, type DoneFilter } from '../dashboard.store';

interface FilterOption {
  readonly id: DoneFilter;
  readonly label: string;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  { id: 'all', label: 'Усі' },
  { id: 'done', label: 'Виконані' },
  { id: 'notDone', label: 'Не виконані' },
];

@Component({
  selector: 'pp-dashboard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Прогрес</h1>
          <p class="mt-1 text-sm text-neutral-600">
            {{ store.doneCount() }} з {{ store.totalCount() }} елементів виконано
          </p>
        </div>

        <div class="flex w-full max-w-sm items-center gap-2 sm:w-auto">
          <label class="sr-only" for="dashboard-search">Пошук елементів</label>
          <input
            id="dashboard-search"
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

      <div role="tablist" aria-label="Фільтр виконання" class="flex flex-wrap gap-2">
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

      @if (store.loading()) {
        <p class="text-sm text-neutral-500">Завантаження…</p>
      } @else if (store.error(); as error) {
        <p role="alert" class="text-sm text-red-600">{{ error }}</p>
      } @else {
        <div class="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside aria-label="Категорії" class="lg:sticky lg:top-20 lg:self-start">
            <ul class="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              <li class="lg:w-full">
                <button
                  type="button"
                  (click)="onCategorySelect(null)"
                  [class]="categoryButtonClass(store.selectedCategoryId() === null)"
                >
                  <span class="truncate">Усі категорії</span>
                  <span class="ml-2 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    {{ store.totalCount() }}
                  </span>
                </button>
              </li>
              @for (cat of store.categories(); track cat.id) {
                <li class="lg:w-full">
                  <button
                    type="button"
                    (click)="onCategorySelect(cat.id)"
                    [class]="categoryButtonClass(store.selectedCategoryId() === cat.id)"
                  >
                    <span class="truncate">{{ cat.name }}</span>
                    <span class="ml-2 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                      {{ store.countByCategory(cat.id).done }}/{{ store.countByCategory(cat.id).total }}
                    </span>
                  </button>
                </li>
              }
            </ul>
          </aside>

          <div>
            @if (store.filteredElements().length === 0) {
              <p class="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500">
                Нічого не знайдено за поточним фільтром.
              </p>
            } @else {
              <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                @for (el of store.filteredElements(); track el.id) {
                  <li>
                    <a
                      [routerLink]="['/app/elements', el.id]"
                      class="group block rounded-xl border border-neutral-200 bg-white p-2 shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <div
                        class="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100"
                        [class.ring-2]="store.isDone(el.id)"
                        [class.ring-primary]="store.isDone(el.id)"
                      >
                        @if (el.image_url) {
                          <img
                            [src]="el.image_url"
                            [alt]="el.name"
                            loading="lazy"
                            class="h-full w-full object-cover"
                          />
                        } @else {
                          <div class="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                            Без фото
                          </div>
                        }

                        @if (store.isDone(el.id)) {
                          <span
                            aria-label="Виконано"
                            class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
                              <path
                                fill-rule="evenodd"
                                d="M16.704 5.296a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414L8.5 12.086l6.79-6.79a1 1 0 011.414 0z"
                                clip-rule="evenodd"
                              />
                            </svg>
                          </span>
                        }
                      </div>
                      <p class="mt-2 truncate text-sm font-medium text-neutral-800 group-hover:text-primary">
                        {{ el.name }}
                      </p>
                    </a>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class DashboardPage implements OnInit {
  protected readonly store = inject(DashboardStore);
  protected readonly filterOptions = FILTER_OPTIONS;

  ngOnInit(): void {
    void this.store.load();
  }

  protected onCategorySelect(id: string | null): void {
    this.store.setSelectedCategory(id);
  }

  protected onFilterChange(filter: DoneFilter): void {
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

  protected categoryButtonClass(active: boolean): string {
    const base =
      'flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30';
    return active
      ? `${base} bg-primary/10 text-primary`
      : `${base} text-neutral-700 hover:bg-neutral-100 hover:text-primary`;
  }
}
