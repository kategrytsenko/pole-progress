import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AttemptsApi,
  type AttemptStage,
  CatalogApi,
  type Element,
  type ElementCategory,
  type ElementStageSummary,
  studentLabel,
  StudentsApi,
  type StudioStudent,
  summarizeElementStages,
} from '@org/data';

export type StudentRecordFilter = 'all' | 'withRecords' | 'withoutRecords';

interface StudentDiaryState {
  student: StudioStudent | null;
  categories: ElementCategory[];
  elements: Element[];
  progress: ReadonlyMap<string, ElementStageSummary>;
  selectedCategoryId: string | null;
  filter: StudentRecordFilter;
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

const INITIAL_STATE: StudentDiaryState = {
  student: null,
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
  if (err instanceof Error) {
    if (err.message === 'Student not found') return 'Учня не знайдено';
    return err.message;
  }
  if (typeof err === 'string') return err;
  return fallback;
}

@Injectable()
export class StudentDiaryStore {
  private readonly students = inject(StudentsApi);
  private readonly catalog = inject(CatalogApi);
  private readonly attempts = inject(AttemptsApi);
  private readonly state = signal<StudentDiaryState>(INITIAL_STATE);
  private loadGeneration = 0;

  readonly student = computed<StudioStudent | null>(() => this.state().student);
  readonly studentName = computed<string>(() => studentLabel(this.state().student?.name));
  readonly categories = computed<ElementCategory[]>(() => this.state().categories);
  readonly selectedCategoryId = computed<string | null>(() => this.state().selectedCategoryId);
  readonly filter = computed<StudentRecordFilter>(() => this.state().filter);
  readonly query = computed<string>(() => this.state().query);
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly error = computed<string | null>(() => this.state().error);
  readonly recordedCount = computed(() => this.state().progress.size);
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

    return elements.filter((element) => {
      if (selectedCategoryId && element.category_id !== selectedCategoryId) return false;

      const hasRecords = progress.has(element.id);
      if (filter === 'withRecords' && !hasRecords) return false;
      if (filter === 'withoutRecords' && hasRecords) return false;

      if (needle.length > 0 && !element.name.toLocaleLowerCase().includes(needle)) return false;
      return true;
    });
  });

  stageOf(elementId: string): AttemptStage | null {
    return this.state().progress.get(elementId)?.stage ?? null;
  }

  async load(studentId: string): Promise<void> {
    const generation = ++this.loadGeneration;
    this.state.update((current) => ({ ...current, loading: true, error: null }));

    try {
      const [student, categories, elements, progressRows] = await Promise.all([
        this.students.getStudent(studentId),
        this.catalog.getCategories(),
        this.catalog.getAllElements(),
        this.attempts.listProgressRows(studentId),
      ]);
      if (generation !== this.loadGeneration) return;

      this.state.update((current) => ({
        ...current,
        student,
        categories,
        elements,
        progress: summarizeElementStages(progressRows),
        loading: false,
      }));
    } catch (err: unknown) {
      if (generation !== this.loadGeneration) return;
      this.state.update((current) => ({
        ...current,
        loading: false,
        error: toErrorMessage(err, 'Failed to load student diary'),
      }));
    }
  }

  setSelectedCategory(id: string | null): void {
    this.state.update((current) => ({ ...current, selectedCategoryId: id }));
  }

  setFilter(filter: StudentRecordFilter): void {
    this.state.update((current) => ({ ...current, filter }));
  }

  setQuery(query: string): void {
    this.state.update((current) => ({ ...current, query }));
  }
}
