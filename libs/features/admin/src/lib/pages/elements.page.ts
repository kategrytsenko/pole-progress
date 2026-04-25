import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CatalogApi,
  type Element as CatalogElement,
  type ElementCategory,
} from '@org/data';
import { ToastService } from '@org/shell';
import { CatalogStorageApi } from '../catalog-storage.api';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

@Component({
  selector: 'pp-elements',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Елементи</h1>
          <p class="mt-1 text-sm text-neutral-600">Керуй каталогом елементів у межах категорій.</p>
        </div>

        <label class="flex items-center gap-2 text-sm">
          <span class="text-neutral-600">Категорія</span>
          <select
            [ngModel]="selectedCategoryId()"
            (ngModelChange)="onCategoryChange($event)"
            name="categoryFilter"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            @for (cat of categories(); track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </label>
      </header>

      @if (loading()) {
        <p class="text-sm text-neutral-500">Завантаження…</p>
      } @else if (categories().length === 0) {
        <p class="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          Спочатку створи хоча б одну категорію.
        </p>
      } @else {
        <form (submit)="onCreate($event)" class="flex items-center gap-2">
          <label class="sr-only" for="new-element">Назва елемента</label>
          <input
            id="new-element"
            type="text"
            required
            maxlength="120"
            [ngModel]="newName()"
            (ngModelChange)="newName.set($event)"
            name="name"
            placeholder="Новий елемент"
            class="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            [disabled]="!canCreate()"
            class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
          >Додати</button>
        </form>

        @if (visibleElements().length === 0) {
          <p class="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500">
            У цій категорії ще немає елементів.
          </p>
        } @else {
          <ul class="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            @for (el of visibleElements(); track el.id; let i = $index) {
              <li class="flex items-center gap-3 px-4 py-2">
                <div class="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  @if (el.image_url) {
                    <img [src]="el.image_url" [alt]="el.name" class="h-full w-full object-cover" />
                  } @else {
                    <div class="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">Без фото</div>
                  }
                </div>

                <span class="flex-1 truncate text-sm font-medium text-neutral-800">{{ el.name }}</span>
                <span class="text-xs text-neutral-400" aria-hidden="true">#{{ el.order }}</span>

                <label class="cursor-pointer rounded p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-primary" aria-label="Завантажити фото">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l3-4 2 2 3-4 4 6z" /></svg>
                  <input
                    type="file"
                    class="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="onImagePicked($event, el)"
                    [disabled]="busyId() === el.id"
                  />
                </label>

                <button
                  type="button"
                  (click)="onMove(i, -1)"
                  [disabled]="i === 0 || busyId() === el.id"
                  aria-label="Перемістити вгору"
                  class="rounded p-1 text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path fill-rule="evenodd" d="M10 5a1 1 0 01.707.293l5 5a1 1 0 01-1.414 1.414L10 7.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5A1 1 0 0110 5z" clip-rule="evenodd" /></svg>
                </button>
                <button
                  type="button"
                  (click)="onMove(i, 1)"
                  [disabled]="i === visibleElements().length - 1 || busyId() === el.id"
                  aria-label="Перемістити вниз"
                  class="rounded p-1 text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path fill-rule="evenodd" d="M10 15a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 12.586l4.293-4.293a1 1 0 011.414 1.414l-5 5A1 1 0 0110 15z" clip-rule="evenodd" /></svg>
                </button>

                <button
                  type="button"
                  (click)="onRename(el)"
                  [disabled]="busyId() === el.id"
                  aria-label="Перейменувати"
                  class="rounded p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L4 13.172V16h2.828l7.379-7.379-2.828-2.828z" /></svg>
                </button>

                <button
                  type="button"
                  (click)="onDelete(el)"
                  [disabled]="busyId() === el.id"
                  aria-label="Видалити"
                  class="rounded p-1 text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-1 1v1H5a1 1 0 100 2h10a1 1 0 100-2h-3V3a1 1 0 00-1-1H9zM6 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm5 0a1 1 0 00-1 1v6a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                </button>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class ElementsPage implements OnInit {
  private readonly catalog = inject(CatalogApi);
  private readonly storage = inject(CatalogStorageApi);
  private readonly toasts = inject(ToastService);

  protected readonly categories = signal<ElementCategory[]>([]);
  protected readonly elements = signal<CatalogElement[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly newName = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly busyId = signal<string | null>(null);

  protected readonly visibleElements = computed<CatalogElement[]>(() => {
    const id = this.selectedCategoryId();
    if (!id) return [];
    return this.elements()
      .filter((el) => el.category_id === id)
      .sort((a, b) => a.order - b.order);
  });

  protected readonly canCreate = computed(
    () => this.newName().trim().length > 0 && this.selectedCategoryId() !== null,
  );

  ngOnInit(): void {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const [cats, elems] = await Promise.all([
        this.catalog.getCategories(),
        this.catalog.getAllElements(),
      ]);
      this.categories.set(cats);
      this.elements.set(elems);
      if (this.selectedCategoryId() === null && cats.length > 0) {
        this.selectedCategoryId.set(cats[0].id);
      }
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося завантажити елементи'));
    } finally {
      this.loading.set(false);
    }
  }

  protected onCategoryChange(id: string): void {
    this.selectedCategoryId.set(id);
  }

  protected async onCreate(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.newName().trim();
    const categoryId = this.selectedCategoryId();
    if (!name || !categoryId) return;

    try {
      const nextOrder =
        this.elements()
          .filter((e) => e.category_id === categoryId)
          .reduce((max, e) => Math.max(max, e.order), -1) + 1;

      const created = await this.catalog.createElement({
        category_id: categoryId,
        name,
        order: nextOrder,
      });
      this.elements.update((list) => [...list, created]);
      this.newName.set('');
      this.toasts.success('Елемент створено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося створити елемент'));
    }
  }

  protected async onRename(el: CatalogElement): Promise<void> {
    if (typeof window === 'undefined') return;
    const next = window.prompt('Нова назва елемента', el.name)?.trim();
    if (!next || next === el.name) return;

    this.busyId.set(el.id);
    try {
      const updated = await this.catalog.updateElement({ id: el.id, name: next });
      this.elements.update((list) =>
        list.map((e) => (e.id === el.id ? updated : e)),
      );
      this.toasts.success('Елемент оновлено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося оновити елемент'));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async onDelete(el: CatalogElement): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm(`Видалити елемент «${el.name}»?`)) {
      return;
    }

    this.busyId.set(el.id);
    try {
      await this.catalog.deleteElement(el.id);
      await this.storage.removeByPublicUrl(el.image_url);
      this.elements.update((list) => list.filter((e) => e.id !== el.id));
      this.toasts.success('Елемент видалено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося видалити елемент'));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async onImagePicked(event: Event, el: CatalogElement): Promise<void> {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (target) target.value = '';
    if (!file) return;

    this.busyId.set(el.id);
    const previousUrl = el.image_url;
    try {
      const { publicUrl } = await this.storage.uploadElementImage(el.id, file);
      const updated = await this.catalog.updateElement({ id: el.id, image_url: publicUrl });
      this.elements.update((list) =>
        list.map((e) => (e.id === el.id ? updated : e)),
      );
      void this.storage.removeByPublicUrl(previousUrl);
      this.toasts.success('Фото оновлено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося завантажити фото'));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async onMove(index: number, delta: -1 | 1): Promise<void> {
    const visible = this.visibleElements();
    const target = index + delta;
    if (target < 0 || target >= visible.length) return;

    const a = visible[index];
    const b = visible[target];
    this.busyId.set(a.id);

    try {
      await this.catalog.reorderElements([
        { id: a.id, order: b.order },
        { id: b.id, order: a.order },
      ]);
      this.elements.update((list) =>
        list.map((e) => {
          if (e.id === a.id) return { ...e, order: b.order };
          if (e.id === b.id) return { ...e, order: a.order };
          return e;
        }),
      );
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося змінити порядок'));
    } finally {
      this.busyId.set(null);
    }
  }
}
