import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { studentLabel } from '@org/data';
import { StateBlockComponent } from '@org/shell';
import { StudentsStore } from '../students.store';

@Component({
  selector: 'pp-students',
  imports: [DatePipe, RouterLink, StateBlockComponent],
  providers: [StudentsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Учні</h1>
          <p class="mt-1 max-w-xl text-sm text-neutral-600">
            Щоденники клієнтів студії. Відкрийте учня, щоб побачити етапи елементів і лишити коментар інструктора.
          </p>
        </div>

        <div class="flex w-full max-w-sm items-center gap-2 sm:w-auto">
          <label class="sr-only" for="students-search">Пошук учнів</label>
          <input
            id="students-search"
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

      @if (store.loading()) {
        <pp-state-block mode="loading" />
      } @else if (store.error(); as error) {
        <pp-state-block mode="error" [message]="error" />
      } @else if (store.filtered().length === 0) {
        <pp-state-block
          mode="empty"
          [message]="store.query()
            ? 'Нікого не знайдено за цим пошуком.'
            : 'Поки немає учнів. Обліковий запис з’явиться тут після першого входу.'"
        />
      } @else {
        <ul class="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          @for (student of store.filtered(); track student.id) {
            <li>
              <a
                [routerLink]="['/app/students', student.id]"
                class="flex items-center gap-3 px-4 py-3 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
              >
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  aria-hidden="true"
                >
                  {{ initial(student.name) }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-neutral-900">
                    {{ label(student.name) }}
                  </span>
                  <span class="mt-0.5 block text-xs text-neutral-500">
                    У студії з {{ student.created_at | date: 'dd.MM.yyyy' }}
                  </span>
                </span>
                <span class="shrink-0 text-sm font-medium text-primary">Щоденник</span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class StudentsPage implements OnInit {
  protected readonly store = inject(StudentsStore);

  ngOnInit(): void {
    void this.store.load();
  }

  protected label(name: string | null): string {
    return studentLabel(name);
  }

  protected initial(name: string | null): string {
    return studentLabel(name).charAt(0).toUpperCase();
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    this.store.setQuery(target.value);
  }
}
