import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore, ProfilesApi, type StudioProfile, type UserRole } from '@org/auth';
import { PassesApi, type ClientPass, type PassProduct } from '@org/data';
import { StateBlockComponent, ToastService } from '@org/shell';
import {
  buildClientDirectory,
  filterClientDirectory,
  type ClientDirectoryRow,
} from '../client-directory';
import { addInputDays, inputDateEndIso, inputDateFromIso, inputDateStartIso, todayInputDate } from '../pass-dates';

const ROLE_OPTIONS: readonly { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Клієнт' },
  { value: 'instructor', label: 'Інструктор' },
  { value: 'admin', label: 'Адмін' },
];

function isUserRole(value: string): value is UserRole {
  return value === 'student' || value === 'instructor' || value === 'admin';
}

function roleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function classCountLabel(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} заняття`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} заняття`;
  return `${count} занять`;
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim().length > 0) return err;
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    const message = err.message.trim();
    if (message.length > 0) return message;
  }
  return fallback;
}

@Component({
  selector: 'pp-clients',
  imports: [FormsModule, StateBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Клієнти</h1>
          <p class="mt-1 text-sm text-neutral-600">
            Профілі студії, ролі та активний абонемент. Видавати абонемент і змінювати роль може лише адміністратор.
          </p>
          @if (!loading() && !loadError()) {
            <p class="mt-2 text-xs font-medium text-neutral-500">
              {{ clients().length }} користувачів · {{ activeCount() }} з активним абонементом
            </p>
          }
        </div>
        <label class="flex w-full flex-col gap-1 text-sm sm:w-72">
          <span class="sr-only">Пошук</span>
          <input
            type="search"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            name="query"
            placeholder="Ім'я, пошта або id"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </header>

      @if (!loading() && !loadError() && products().length === 0) {
        <p class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          У каталозі немає абонементів, тож видати або продовжити поки не можна.
        </p>
      }

      @if (loading()) {
        <pp-state-block mode="loading" />
      } @else if (loadError(); as message) {
        <div class="space-y-3">
          <pp-state-block mode="error" [message]="message" />
          <button
            type="button"
            (click)="refresh()"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-100"
          >Спробувати ще раз</button>
        </div>
      } @else if (clients().length === 0) {
        <pp-state-block mode="empty" message="Користувачів ще немає." />
      } @else if (visibleClients().length === 0) {
        <pp-state-block mode="empty" message="Нікого не знайдено за цим запитом." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-neutral-200 text-sm">
            <thead class="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" class="px-4 py-3">Ім'я</th>
                <th scope="col" class="px-4 py-3">Пошта / id</th>
                <th scope="col" class="px-4 py-3">Роль</th>
                <th scope="col" class="px-4 py-3">Абонемент</th>
                <th scope="col" class="px-4 py-3"><span class="sr-only">Дії</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200">
              @for (row of visibleClients(); track row.id) {
                <tr class="align-top">
                  <td class="px-4 py-3 font-medium text-neutral-900">{{ row.name }}</td>
                  <td class="px-4 py-3">
                    <div class="text-neutral-800">{{ row.email ?? 'Без пошти' }}</div>
                    <div class="mt-0.5 font-mono text-xs text-neutral-400">{{ row.id }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <label class="sr-only" [attr.for]="'role-' + row.id">Роль для {{ row.name }}</label>
                    <select
                      [id]="'role-' + row.id"
                      [value]="row.role"
                      (change)="onRoleChange(row, $event)"
                      [disabled]="roleBusyId() === row.id || row.id === currentUserId()"
                      [attr.title]="row.id === currentUserId() ? 'Свою роль змінює інший адміністратор' : null"
                      class="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                    >
                      @for (option of roleOptions; track option.value) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  </td>
                  <td class="px-4 py-3">
                    @if (row.membership; as pass) {
                      <span class="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">Активний</span>
                      <p class="mt-1 text-xs text-neutral-600">до {{ formatDate(pass.valid_until) }}</p>
                      <p class="text-xs text-neutral-500">{{ classCountLabel(pass.remaining) }}</p>
                    } @else {
                      <span class="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">Немає</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      (click)="openPass(row)"
                      [disabled]="products().length === 0 || roleBusyId() === row.id"
                      class="whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >{{ row.membership ? 'Продовжити' : 'Видати' }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <dialog
      #passDialog
      (close)="onPassDialogClose()"
      class="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      @if (passTarget(); as target) {
        <form (submit)="onIssuePass($event)" class="flex flex-col">
          <header class="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <h2 class="text-base font-semibold">
              {{ target.membership ? 'Продовжити абонемент' : 'Видати абонемент' }}
            </h2>
            <button
              type="button"
              (click)="closePass()"
              aria-label="Закрити"
              class="rounded p-1 text-neutral-500 hover:bg-neutral-100"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </header>

          <div class="flex flex-col gap-4 px-5 py-4">
            <p class="text-sm text-neutral-600">
              {{ target.name }}
              @if (target.email) {
                <span class="text-neutral-400">· {{ target.email }}</span>
              }
            </p>
            <p class="text-xs text-neutral-500">
              @if (target.membership) {
                Оновиться поточний активний абонемент: статус «active», нові дати та кількість занять з обраного продукту.
              } @else {
                З'явиться новий абонемент зі статусом «active».
              }
            </p>

            @if (choosableProducts().length === 0) {
              <p class="text-sm text-amber-800">У каталозі немає абонементів.</p>
            } @else {
              <label class="flex flex-col gap-1 text-sm">
                <span class="font-medium text-neutral-800">Абонемент</span>
                <select
                  required
                  [ngModel]="productId()"
                  (ngModelChange)="onProductChange($event)"
                  name="productId"
                  class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  @for (product of choosableProducts(); track product.id) {
                    <option [value]="product.id">{{ product.name }} · {{ classCountLabel(product.class_count) }} · {{ product.validity_days }} дн.</option>
                  }
                </select>
              </label>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-medium text-neutral-800">Діє з</span>
                  <input
                    type="date"
                    required
                    [ngModel]="validFrom()"
                    (ngModelChange)="onValidFromChange($event)"
                    name="validFrom"
                    class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-medium text-neutral-800">Діє до</span>
                  <input
                    type="date"
                    required
                    [min]="validFrom()"
                    [ngModel]="validUntil()"
                    (ngModelChange)="validUntil.set($event)"
                    name="validUntil"
                    class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            }
          </div>

          <footer class="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              (click)="closePass()"
              class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >Скасувати</button>
            <button
              type="submit"
              [disabled]="!canIssuePass()"
              class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
            >{{ savingPass() ? 'Збереження…' : 'Зберегти' }}</button>
          </footer>
        </form>
      }
    </dialog>
  `,
})
export class ClientsPage implements OnInit {
  private readonly profilesApi = inject(ProfilesApi);
  private readonly passesApi = inject(PassesApi);
  private readonly auth = inject(AuthStore);
  private readonly toasts = inject(ToastService);
  private readonly passDialog = viewChild<ElementRef<HTMLDialogElement>>('passDialog');

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly classCountLabel = classCountLabel;

  private readonly profileRows = signal<StudioProfile[]>([]);
  private readonly emails = signal<ReadonlyMap<string, string>>(new Map());
  private readonly passes = signal<ClientPass[]>([]);
  private readonly asOf = signal<Date>(new Date());

  protected readonly products = signal<PassProduct[]>([]);
  protected readonly query = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly roleBusyId = signal<string | null>(null);
  protected readonly passTarget = signal<ClientDirectoryRow | null>(null);
  protected readonly productId = signal<string>('');
  protected readonly validFrom = signal<string>('');
  protected readonly validUntil = signal<string>('');
  protected readonly savingPass = signal<boolean>(false);

  protected readonly currentUserId = computed<string | null>(() => this.auth.user()?.id ?? null);

  protected readonly clients = computed(() =>
    buildClientDirectory(this.profileRows(), this.emails(), this.passes(), this.asOf()),
  );

  protected readonly visibleClients = computed(() => filterClientDirectory(this.clients(), this.query()));

  protected readonly activeCount = computed(
    () => this.clients().filter((row) => row.membership !== null).length,
  );

  protected readonly choosableProducts = computed(() => {
    const all = this.products();
    const active = all.filter((product) => product.active);
    const base = active.length > 0 ? active : all;
    const currentId = this.passTarget()?.membership?.product_id;
    if (!currentId || base.some((product) => product.id === currentId)) return base;
    const current = all.find((product) => product.id === currentId);
    return current ? [current, ...base] : base;
  });

  protected readonly canIssuePass = computed(() => {
    if (this.savingPass()) return false;
    const from = this.validFrom();
    const until = this.validUntil();
    return this.productId().length > 0 && from.length > 0 && until.length > 0 && until >= from;
  });

  ngOnInit(): void {
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [profiles, emails, passes, products] = await Promise.all([
        this.profilesApi.listProfiles(),
        this.profilesApi.listProfileEmails(),
        this.passesApi.listPasses(),
        this.passesApi.listProducts(),
      ]);
      this.profileRows.set(profiles);
      this.emails.set(emails);
      this.passes.set(passes);
      this.products.set(products);
      this.asOf.set(new Date());
    } catch (err) {
      this.loadError.set(toErrorMessage(err, 'Не вдалося завантажити клієнтів.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async onRoleChange(row: ClientDirectoryRow, event: Event): Promise<void> {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    const next = select.value;
    if (!isUserRole(next) || next === row.role) {
      select.value = row.role;
      return;
    }

    const label = roleLabel(next);
    if (typeof window !== 'undefined' && !window.confirm(`Змінити роль «${row.name}» на «${label}»?`)) {
      select.value = row.role;
      return;
    }

    this.roleBusyId.set(row.id);
    try {
      await this.profilesApi.updateRole(row.id, next);
      this.profileRows.update((list) =>
        list.map((profile) => (profile.id === row.id ? { ...profile, role: next } : profile)),
      );
      this.toasts.success(`Роль змінено на «${label}».`);
    } catch (err) {
      select.value = row.role;
      this.toasts.error(toErrorMessage(err, 'Не вдалося змінити роль.'));
    } finally {
      this.roleBusyId.set(null);
    }
  }

  protected openPass(row: ClientDirectoryRow): void {
    this.passTarget.set(row);
    const options = this.choosableProducts();
    const membership = row.membership;
    const product = options.find((item) => item.id === membership?.product_id) ?? options[0];
    const from = membership ? inputDateFromIso(membership.valid_from) : todayInputDate(new Date());
    const until = membership
      ? inputDateFromIso(membership.valid_until)
      : addInputDays(from, product?.validity_days ?? 30);

    this.productId.set(product?.id ?? '');
    this.validFrom.set(from);
    this.validUntil.set(until);

    setTimeout(() => {
      const dialog = this.passDialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  protected closePass(): void {
    this.passDialog()?.nativeElement.close();
  }

  protected onPassDialogClose(): void {
    this.passTarget.set(null);
    this.savingPass.set(false);
  }

  protected onProductChange(productId: string): void {
    this.productId.set(productId);
    if (this.passTarget()?.membership) return;
    this.applySuggestedEnd(this.validFrom(), productId);
  }

  protected onValidFromChange(value: string): void {
    this.validFrom.set(value);
    if (this.passTarget()?.membership) return;
    this.applySuggestedEnd(value, this.productId());
  }

  protected async onIssuePass(event: Event): Promise<void> {
    event.preventDefault();
    const target = this.passTarget();
    const product = this.choosableProducts().find((item) => item.id === this.productId());
    if (!target || !product || !this.canIssuePass()) return;

    this.savingPass.set(true);
    try {
      await this.passesApi.issuePass({
        userId: target.id,
        passId: target.membership?.id,
        productId: product.id,
        remaining: product.class_count,
        validFrom: inputDateStartIso(this.validFrom()),
        validUntil: inputDateEndIso(this.validUntil()),
      });
      this.toasts.success(target.membership ? 'Абонемент продовжено.' : 'Абонемент видано.');
      this.closePass();
      await this.refresh();
    } catch (err) {
      this.savingPass.set(false);
      this.toasts.error(toErrorMessage(err, 'Не вдалося зберегти абонемент.'));
    }
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }

  private applySuggestedEnd(from: string, productId: string): void {
    const product = this.products().find((item) => item.id === productId);
    if (!product || from.length === 0) return;
    this.validUntil.set(addInputDays(from, product.validity_days));
  }
}
