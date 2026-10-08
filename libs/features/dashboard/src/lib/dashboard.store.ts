import { computed, inject, Injectable, signal } from '@angular/core';
import {
  applyAttemptToSummary,
  AttemptsApi,
  type AttemptStage,
  CatalogApi,
  type Element,
  type ElementAttempt,
  type ElementCategory,
  type ElementStageSummary,
  summarizeElementStages,
} from '@org/data';

export type DoneFilter = 'all' | 'done' | 'notDone';

interface DashboardState {
  categories: ElementCategory[];
  elements: Element[];
  progress: ReadonlyMap<string, ElementStageSummary>;
  selectedCategoryId: string | null;
  filter: DoneFilter;
  query: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_STAGE_COUNTS: Record<AttemptStage, number> = {
  trying: 0,
  in_progress: 0,
  held: 0,
  mastered: 0,
};

const INITIAL_STATE: DashboardState = {
  categories: [],
  elements: [],
  progress: new Map<string, ElementStageSummary>(),
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
  readonly selectedCategoryId = computed<string | null>(() => this.state().selectedCategoryId);
  readonly filter = computed<DoneFilter>(() => this.state().filter);
  readonly query = computed<string>(() => this.state().query);
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly error = computed<string | null>(() => this.state().error);

  readonly doneCount = computed(() => this.state().progress.size);
  readonly totalCount = computed(() => this.state().elements.length);
  readonly stageCounts = computed<Record<AttemptStage, number>>(() => {
    const counts: Record<AttemptStage, number> = { ...EMPTY_STAGE_COUNTS };
    for (const summary of this.state().progress.values()) {
      counts[summary.stage] += 1;
    }
    return counts;
  });

  readonly filteredElements = computed<Element[]>(() => {
    const { elements, progress, selectedCategoryId, filter, query } = this.state();
    const needle = query.trim().toLocaleLowerCase();

    return elements.filter((el) => {
      if (selectedCategoryId && el.category_id !== selectedCategoryId) return false;

      const isDone = progress.has(el.id);
      if (filter === 'done' && !isDone) return false;
      if (filter === 'notDone' && isDone) return false;

      if (needle.length > 0 && !el.name.toLocaleLowerCase().includes(needle)) {
        return false;
      }

      return true;
    });
  });

  stageOf(elementId: string): AttemptStage | null {
    return this.state().progress.get(elementId)?.stage ?? null;
  }

  countByCategory(categoryId: string): { total: number; done: number } {
    const { elements, progress } = this.state();
    let total = 0;
    let done = 0;
    for (const el of elements) {
      if (el.category_id !== categoryId) continue;
      total += 1;
      if (progress.has(el.id)) done += 1;
    }
    return { total, done };
  }

  async load(): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const [categories, elements, progressRows] = await Promise.all([
        this.catalog.getCategories(),
        this.catalog.getAllElements(),
        this.attempts.listMyProgressRows(),
      ]);

      this.state.update((s) => ({
        ...s,
        categories,
        elements,
        progress: summarizeElementStages(progressRows),
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
   * Folds a newly saved attempt into the diary summary without a refetch.
   * A backdated attempt increments the count and leaves the newer stage in place.
   */
  recordAttempt(attempt: Pick<ElementAttempt, 'element_id' | 'stage' | 'date' | 'created_at'>): void {
    this.state.update((s) => {
      const next = new Map(s.progress);
      next.set(
        attempt.element_id,
        applyAttemptToSummary(next.get(attempt.element_id), {
          element_id: attempt.element_id,
          stage: attempt.stage,
          date: attempt.date,
          created_at: attempt.created_at,
        }),
      );
      return { ...s, progress: next };
    });
  }
}
