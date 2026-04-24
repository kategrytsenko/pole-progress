import { computed, Injectable, signal } from '@angular/core';

export type ToastLevel = 'info' | 'success' | 'error';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly level: ToastLevel;
}

const DEFAULT_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = signal<readonly Toast[]>([]);
  private nextId = 1;

  readonly entries = computed<readonly Toast[]>(() => this.toasts());

  show(message: string, level: ToastLevel = 'info', durationMs = DEFAULT_DURATION_MS): number {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, level }]);

    if (durationMs > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => this.dismiss(id), durationMs);
    }

    return id;
  }

  success(message: string, durationMs?: number): number {
    return this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs?: number): number {
    return this.show(message, 'error', durationMs ?? DEFAULT_DURATION_MS * 1.5);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
