import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogApi, type ElementCategory } from '@org/data';
import { StateBlockComponent, ToastService } from '@org/shell';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

@Component({
  selector: 'pp-categories',
  imports: [FormsModule, StateBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Категорії</h1>
        <p class="mt-1 text-sm text-neutral-600">Створюй, перейменовуй, змінюй порядок та видаляй категорії.</p>
      </header>

      <form (submit)="onCreate($event)" class="flex items-center gap-2">
        <label class="sr-only" for="new-category">Назва категорії</label>
        <input
          id="new-category"
          type="text"
          required
          maxlength="80"
          [ngModel]="newName()"
          (ngModelChange)="newName.set($event)"
          name="name"
          placeholder="Нова категорія"
          class="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          [disabled]="!canCreate()"
          class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
        >Додати</button>
      </form>

      @if (loading()) {
        <pp-state-block mode="loading" />
      } @else if (categories().length === 0) {
        <pp-state-block mode="empty" message="Категорій поки немає." />
      } @else {
        <ul class="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          @for (cat of categories(); track cat.id; let i = $index) {
            <li class="flex items-center gap-3 px-4 py-2">
              <span class="flex-1 text-sm font-medium text-neutral-800">{{ cat.name }}</span>

              <span class="text-xs text-neutral-400" aria-hidden="true">#{{ cat.order }}</span>

              <button
                type="button"
                (click)="onMove(i, -1)"
                [disabled]="i === 0 || busyId() === cat.id"
                aria-label="Перемістити вгору"
                class="rounded p-1 text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path fill-rule="evenodd" d="M10 5a1 1 0 01.707.293l5 5a1 1 0 01-1.414 1.414L10 7.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5A1 1 0 0110 5z" clip-rule="evenodd" /></svg>
              </button>
              <button
                type="button"
                (click)="onMove(i, 1)"
                [disabled]="i === categories().length - 1 || busyId() === cat.id"
                aria-label="Перемістити вниз"
                class="rounded p-1 text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path fill-rule="evenodd" d="M10 15a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 12.586l4.293-4.293a1 1 0 011.414 1.414l-5 5A1 1 0 0110 15z" clip-rule="evenodd" /></svg>
              </button>

              <button
                type="button"
                (click)="onRename(cat)"
                [disabled]="busyId() === cat.id"
                aria-label="Перейменувати"
                class="rounded p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L4 13.172V16h2.828l7.379-7.379-2.828-2.828z" /></svg>
              </button>

              <button
                type="button"
                (click)="onDelete(cat)"
                [disabled]="busyId() === cat.id"
                aria-label="Видалити"
                class="rounded p-1 text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-1 1v1H5a1 1 0 100 2h10a1 1 0 100-2h-3V3a1 1 0 00-1-1H9zM6 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm5 0a1 1 0 00-1 1v6a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
              </button>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class CategoriesPage implements OnInit {
  private readonly catalog = inject(CatalogApi);
  private readonly toasts = inject(ToastService);

  protected readonly categories = signal<ElementCategory[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly newName = signal<string>('');
  protected readonly busyId = signal<string | null>(null);

  protected readonly canCreate = computed(() => this.newName().trim().length > 0);

  ngOnInit(): void {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.catalog.getCategories();
      this.categories.set(list);
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося завантажити категорії'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async onCreate(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.newName().trim();
    if (!name) return;

    try {
      const nextOrder = this.categories().reduce((max, c) => Math.max(max, c.order), -1) + 1;
      const created = await this.catalog.createCategory({ name, order: nextOrder });
      this.categories.update((list) => [...list, created]);
      this.newName.set('');
      this.toasts.success('Категорію створено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося створити категорію'));
    }
  }

  protected async onRename(cat: ElementCategory): Promise<void> {
    if (typeof window === 'undefined') return;
    const next = window.prompt('Нова назва категорії', cat.name)?.trim();
    if (!next || next === cat.name) return;

    this.busyId.set(cat.id);
    try {
      const updated = await this.catalog.updateCategory({ id: cat.id, name: next });
      this.categories.update((list) =>
        list.map((c) => (c.id === cat.id ? updated : c)),
      );
      this.toasts.success('Категорію оновлено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося оновити категорію'));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async onDelete(cat: ElementCategory): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm(`Видалити категорію «${cat.name}»? Усі її елементи теж зникнуть.`)) {
      return;
    }

    this.busyId.set(cat.id);
    try {
      await this.catalog.deleteCategory(cat.id);
      this.categories.update((list) => list.filter((c) => c.id !== cat.id));
      this.toasts.success('Категорію видалено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося видалити категорію'));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async onMove(index: number, delta: -1 | 1): Promise<void> {
    const list = this.categories();
    const target = index + delta;
    if (target < 0 || target >= list.length) return;

    const a = list[index];
    const b = list[target];
    this.busyId.set(a.id);

    try {
      await this.catalog.reorderCategories([
        { id: a.id, order: b.order },
        { id: b.id, order: a.order },
      ]);
      const next = [...list];
      next[index] = { ...b, order: a.order };
      next[target] = { ...a, order: b.order };
      next.sort((x, y) => x.order - y.order);
      this.categories.set(next);
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося змінити порядок'));
    } finally {
      this.busyId.set(null);
    }
  }
}
