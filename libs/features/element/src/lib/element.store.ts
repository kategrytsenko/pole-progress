import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AttemptsApi,
  type AttemptStage,
  CatalogApi,
  type CreateAttemptInput,
  type Element,
  type ElementAttempt,
  type UpdateAttemptInput,
  MediaApi,
  type MediaItem,
  type MediaType,
  StudentsApi,
} from '@org/data';
import { buildAttemptTimeline, type AttemptTimelineEntry } from './timeline';

export interface MediaItemView extends MediaItem {
  readonly signedUrl: string | null;
}

interface ElementState {
  element: Element | null;
  studentName: string | null;
  attempts: ElementAttempt[];
  mediaByAttempt: ReadonlyMap<string, MediaItemView[]>;
  loading: boolean;
  saving: boolean;
  savingFeedbackId: string | null;
  error: string | null;
}

const INITIAL_STATE: ElementState = {
  element: null,
  studentName: null,
  attempts: [],
  mediaByAttempt: new Map<string, MediaItemView[]>(),
  loading: true,
  saving: false,
  savingFeedbackId: null,
  error: null,
};

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

/**
 * NOT providedIn: 'root' — provided per-route at ElementPage so each
 * navigation gets a fresh instance, which makes load() naturally race-safe
 * (no concurrent navigations share state).
 */
@Injectable()
export class ElementStore {
  private readonly catalog = inject(CatalogApi);
  private readonly attempts = inject(AttemptsApi);
  private readonly students = inject(StudentsApi);
  private readonly media = inject(MediaApi);

  private readonly state = signal<ElementState>(INITIAL_STATE);
  private loadGeneration = 0;

  readonly element = computed<Element | null>(() => this.state().element);
  readonly studentName = computed<string | null>(() => this.state().studentName);
  readonly timeline = computed<AttemptTimelineEntry<MediaItemView>[]>(() =>
    buildAttemptTimeline(this.state().attempts, this.state().mediaByAttempt),
  );
  readonly latestStage = computed<AttemptStage | null>(() => {
    const entries = this.timeline();
    return entries.length > 0 ? entries[entries.length - 1].attempt.stage : null;
  });
  readonly loading = computed<boolean>(() => this.state().loading);
  readonly saving = computed<boolean>(() => this.state().saving);
  readonly savingFeedbackId = computed<string | null>(() => this.state().savingFeedbackId);
  readonly error = computed<string | null>(() => this.state().error);

  mediaFor(attemptId: string): readonly MediaItemView[] {
    return this.state().mediaByAttempt.get(attemptId) ?? [];
  }

  async load(elementId: string, studentId?: string | null): Promise<void> {
    const generation = ++this.loadGeneration;
    const reviewId = studentId?.trim() || null;
    this.state.update((s) => ({ ...s, loading: true, error: null, studentName: null }));

    try {
      const [element, attempts, student] = await Promise.all([
        this.catalog.getElement(elementId),
        reviewId
          ? this.attempts.listAttemptsForElement(elementId, reviewId)
          : this.attempts.listMyAttemptsForElement(elementId),
        reviewId ? this.students.getStudent(reviewId) : Promise.resolve(null),
      ]);
      if (generation !== this.loadGeneration) return;

      const mediaByAttempt = await this.loadMediaForAttempts(attempts);
      if (generation !== this.loadGeneration) return;

      this.state.update((s) => ({
        ...s,
        element,
        studentName: student?.name ?? null,
        attempts,
        mediaByAttempt,
        loading: false,
      }));
    } catch (err: unknown) {
      if (generation !== this.loadGeneration) return;
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: toErrorMessage(err, 'Failed to load element'),
      }));
    }
  }

  /** Staff-only write. The student's attempt text and stage stay unchanged. */
  async saveInstructorFeedback(attemptId: string, body: string): Promise<void> {
    this.state.update((s) => ({ ...s, savingFeedbackId: attemptId }));
    try {
      const feedback = await this.attempts.upsertInstructorFeedback({ attemptId, body });
      this.state.update((s) => ({
        ...s,
        savingFeedbackId: null,
        attempts: s.attempts.map((existing) =>
          existing.id === attemptId ? { ...existing, instructor_feedback: feedback } : existing,
        ),
      }));
    } catch (err: unknown) {
      this.state.update((s) => ({ ...s, savingFeedbackId: null }));
      throw err;
    }
  }

  async createAttempt(input: CreateAttemptInput, files: File[]): Promise<ElementAttempt> {
    this.state.update((s) => ({ ...s, saving: true, error: null }));
    try {
      const attempt = await this.attempts.createAttempt(input);
      const views = await this.uploadAndResolve(attempt.id, files);

      this.state.update((s) => {
        const nextMap = new Map(s.mediaByAttempt);
        nextMap.set(attempt.id, views);
        return {
          ...s,
          attempts: [attempt, ...s.attempts],
          mediaByAttempt: nextMap,
          saving: false,
        };
      });

      return attempt;
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        saving: false,
        error: toErrorMessage(err, 'Failed to create attempt'),
      }));
      throw err;
    }
  }

  async updateAttempt(input: UpdateAttemptInput, files: File[]): Promise<ElementAttempt> {
    this.state.update((s) => ({ ...s, saving: true, error: null }));
    try {
      const attempt = await this.attempts.updateAttempt(input);
      const views = files.length > 0 ? await this.uploadAndResolve(attempt.id, files) : null;

      this.state.update((s) => {
        const nextMap = new Map(s.mediaByAttempt);
        if (views) nextMap.set(attempt.id, views);
        return {
          ...s,
          attempts: s.attempts.map((existing) =>
            existing.id === attempt.id ? attempt : existing,
          ),
          mediaByAttempt: nextMap,
          saving: false,
        };
      });

      return attempt;
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        saving: false,
        error: toErrorMessage(err, 'Failed to update attempt'),
      }));
      throw err;
    }
  }

  async deleteMedia(attemptId: string, mediaId: string): Promise<void> {
    await this.media.delete(mediaId);
    this.state.update((s) => {
      const current = s.mediaByAttempt.get(attemptId) ?? [];
      const nextMap = new Map(s.mediaByAttempt);
      nextMap.set(
        attemptId,
        current.filter((item) => item.id !== mediaId),
      );
      return { ...s, mediaByAttempt: nextMap };
    });
  }

  async deleteAttempt(attemptId: string): Promise<void> {
    try {
      await this.attempts.deleteAttempt(attemptId);
      this.state.update((s) => {
        const nextMap = new Map(s.mediaByAttempt);
        nextMap.delete(attemptId);
        return {
          ...s,
          attempts: s.attempts.filter((a) => a.id !== attemptId),
          mediaByAttempt: nextMap,
        };
      });
    } catch (err: unknown) {
      this.state.update((s) => ({
        ...s,
        error: toErrorMessage(err, 'Failed to delete attempt'),
      }));
      throw err;
    }
  }

  private async uploadAndResolve(
    attemptId: string,
    files: readonly File[],
  ): Promise<MediaItemView[]> {
    if (files.length > 0) {
      await Promise.all(
        files.map((file) =>
          this.media.uploadAndAttach({
            attemptId,
            file,
            type: detectMediaType(file),
          }),
        ),
      );
    }

    const items = await this.media.listForAttempt(attemptId);
    return this.resolveSignedUrls(items);
  }

  private async loadMediaForAttempts(
    attempts: ElementAttempt[],
  ): Promise<Map<string, MediaItemView[]>> {
    const map = new Map<string, MediaItemView[]>();
    if (attempts.length === 0) return map;

    const lists = await Promise.all(
      attempts.map((a) =>
        this.media.listForAttempt(a.id).then((items) => ({ id: a.id, items })),
      ),
    );

    await Promise.all(
      lists.map(async ({ id, items }) => {
        const views = await this.resolveSignedUrls(items);
        map.set(id, views);
      }),
    );

    return map;
  }

  private async resolveSignedUrls(items: MediaItem[]): Promise<MediaItemView[]> {
    if (items.length === 0) return [];
    const settled = await Promise.all(
      items.map(async (item): Promise<MediaItemView> => {
        try {
          const signedUrl = await this.media.getSignedUrl(item.url);
          return { ...item, signedUrl };
        } catch {
          return { ...item, signedUrl: null };
        }
      }),
    );
    return settled;
  }
}

function detectMediaType(file: File): MediaType {
  return file.type.startsWith('video/') ? 'video' : 'image';
}
