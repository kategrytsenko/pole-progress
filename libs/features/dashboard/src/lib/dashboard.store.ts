import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AttemptsApi,
  CatalogApi,
  type Element,
  type ElementCategory,
} from '@org/data';

export type DoneFilter = 'all' | 'done' | 'notDone';

interface DashboardState {
  categories: ElementCategory[];
  elements: Element[];
  doneIds: ReadonlySet<string>;
  selectedCategoryId: string | null;
  filter: DoneFilter;
  query: string;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: DashboardState = {
  categories: [],
  elements: [],
  doneIds: new Set<string>(),
  selectedCategoryId: null,
  filter: 'all',
  query: '',
  loading: true,
  error: null,
};

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly catalog = inject(CatalogApi);
  private readonly attempts = inject(AttemptsApi);

  private readonly state = signal<DashboardState>(INITIAL_STATE);

  readonly categories = computed<ElementCategory[]>(() => this.state().categories);
  readonly elements = computed<Element[]>(() => this.state().elements);
  readonly doneIds = computed<ReadonlySet<string>>(() => this.state().doneIds);
  readonly selectedCategoryId = computed<string | null>(() => this.state().selectedCategoryId);
  readonly filter = computed<DoneFilter>(() => this.state().filter);
  readonly query = computed<string>(() => this.state().query);
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly error = computed<string | null>(() => this.state().error);

  readonly doneCount = computed(() => this.state().doneIds.size);
  readonly totalCount = computed(() => this.state().elements.length);

  readonly filteredElements = computed<Element[]>(() => {
    const { elements, doneIds, selectedCategoryId, filter, query } = this.state();
    const needle = query.trim().toLocaleLowerCase();

    return elements.filter((el) => {
      if (selectedCategoryId && el.category_id !== selectedCategoryId) return false;

      const isDone = doneIds.has(el.id);
      if (filter === 'done' && !isDone) return false;
      if (filter === 'notDone' && isDone) return false;

      if (needle.length > 0 && !el.name.toLocaleLowerCase().includes(needle)) {
        return false;
      }

      return true;
    });
  });

  isDone(elementId: string): boolean {
    return this.state().doneIds.has(elementId);
  }

  countByCategory(categoryId: string): { total: number; done: number } {
    const { elements, doneIds } = this.state();
    let total = 0;
    let done = 0;
    for (const el of elements) {
      if (el.category_id !== categoryId) continue;
      total += 1;
      if (doneIds.has(el.id)) done += 1;
    }
    return { total, done };
  }

  async load(): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const [categories, elements, doneIds] = await Promise.all([
        this.catalog.getCategories(),
        this.catalog.getAllElements(),
        this.attempts.getMyDoneElementIds(),
      ]);

      this.state.update((s) => ({
        ...s,
        categories,
        elements,
        doneIds,
        loading: false,
      }));
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toErrorMessage(err, 'Failed to load dashboard'),
      }));
    }
  }

  setSelectedCategory(id: string | null): void {
    this.state.update((s) => ({ ...s, selectedCategoryId: id }));
  }

  setFilter(filter: DoneFilter): void {
    this.state.update((s) => ({ ...s, filter }));
  }

  setQuery(query: string): void {
    this.state.update((s) => ({ ...s, query }));
  }

  /**
   * Locally marks an element as done after a successful attempt insert
   * elsewhere, avoiding a refetch round-trip.
   */
  markDone(elementId: string): void {
    this.state.update((s) => {
      if (s.doneIds.has(elementId)) return s;
      const next = new Set(s.doneIds);
      next.add(elementId);
      return { ...s, doneIds: next };
    });
  }
}
