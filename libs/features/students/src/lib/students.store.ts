import { computed, inject, Injectable, signal } from '@angular/core';
import { studentLabel, StudentsApi, type StudioStudent } from '@org/data';

interface StudentsState {
  students: StudioStudent[];
  query: string;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: StudentsState = {
  students: [],
  query: '',
  loading: true,
  error: null,
};

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

@Injectable()
export class StudentsStore {
  private readonly api = inject(StudentsApi);
  private readonly state = signal<StudentsState>(INITIAL_STATE);

  readonly query = computed<string>(() => this.state().query);
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly error = computed<string | null>(() => this.state().error);
  readonly filtered = computed<StudioStudent[]>(() => {
    const needle = this.state().query.trim().toLocaleLowerCase();
    if (needle.length === 0) return this.state().students;
    return this.state().students.filter((student) =>
      studentLabel(student.name).toLocaleLowerCase().includes(needle),
    );
  });

  async load(): Promise<void> {
    this.state.update((current) => ({ ...current, loading: true, error: null }));
    try {
      const students = await this.api.listStudents();
      this.state.update((current) => ({ ...current, students, loading: false }));
    } catch (err: unknown) {
      this.state.update((current) => ({
        ...current,
        loading: false,
        error: toErrorMessage(err, 'Failed to load students'),
      }));
    }
  }

  setQuery(query: string): void {
    this.state.update((current) => ({ ...current, query }));
  }
}
