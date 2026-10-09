import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JournalsApi, studentLabel, type PublicJournal } from '@org/data';
import { StateBlockComponent } from '@org/shell';

@Component({
  selector: 'pp-journals',
  imports: [RouterLink, StateBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Щоденники</h1>
        <p class="mt-1 max-w-xl text-sm text-neutral-600">
          Публічні щоденники клієнтів студії. Приватні тут не показуються.
        </p>
      </header>

      @if (loading()) {
        <pp-state-block mode="loading" />
      } @else if (error(); as message) {
        <pp-state-block mode="error" [message]="message" />
      } @else if (journals().length === 0) {
        <pp-state-block
          mode="empty"
          message="Поки ніхто не відкрив щоденник для інших клієнтів."
        />
      } @else {
        <ul
          aria-label="Публічні щоденники"
          class="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
        >
          @for (journal of journals(); track journal.id) {
            <li>
              <a
                [routerLink]="['/app/journals', journal.id]"
                class="flex items-center gap-3 px-4 py-3 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
              >
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  aria-hidden="true"
                >
                  {{ initial(journal.name) }}
                </span>
                <span class="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">
                  {{ label(journal.name) }}
                </span>
                <span class="shrink-0 text-sm font-medium text-primary">Відкрити</span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class JournalsPage implements OnInit {
  private readonly api = inject(JournalsApi);

  protected readonly journals = signal<PublicJournal[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  protected label(name: string | null): string {
    return studentLabel(name);
  }

  protected initial(name: string | null): string {
    return studentLabel(name).charAt(0).toUpperCase();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.journals.set(await this.api.listPublicJournals());
      this.loading.set(false);
    } catch (err: unknown) {
      this.loading.set(false);
      this.error.set(err instanceof Error ? err.message : 'Не вдалося завантажити щоденники');
    }
  }
}
