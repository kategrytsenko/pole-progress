import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrandingService, SettingsApi, type AppSettings } from '@org/data';
import { ToastService } from '@org/shell';
import { CatalogStorageApi } from '../catalog-storage.api';

const FALLBACK_PRIMARY = '#7C3AED';
const FALLBACK_NAME = 'Pole Studio';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

@Component({
  selector: 'pp-branding',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Брендинг</h1>
        <p class="mt-1 text-sm text-neutral-600">Назва студії, основний колір та лого. Зміни застосовуються миттєво.</p>
      </header>

      @if (loading()) {
        <p class="text-sm text-neutral-500">Завантаження…</p>
      } @else {
        <form (submit)="onSave($event)" class="grid max-w-xl gap-5">
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-neutral-800">Назва студії</span>
            <input
              type="text"
              required
              maxlength="80"
              [ngModel]="studioName()"
              (ngModelChange)="onStudioNameChange($event)"
              name="studioName"
              class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label class="flex items-center gap-3 text-sm">
            <span class="font-medium text-neutral-800">Основний колір</span>
            <input
              type="color"
              [ngModel]="primaryColor()"
              (ngModelChange)="onPrimaryColorChange($event)"
              name="primaryColor"
              class="h-9 w-16 cursor-pointer rounded border border-neutral-300 bg-white p-1"
            />
            <code class="rounded bg-neutral-100 px-2 py-0.5 text-xs">{{ primaryColor() }}</code>
          </label>

          <div class="flex flex-col gap-2 text-sm">
            <span class="font-medium text-neutral-800">Логотип</span>
            <div class="flex items-center gap-3">
              <div class="h-16 w-16 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                @if (logoUrl(); as url) {
                  <img [src]="url" alt="Лого" class="h-full w-full object-cover" />
                } @else {
                  <div class="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">Без лого</div>
                }
              </div>
              <label class="cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100">
                Завантажити…
                <input
                  type="file"
                  class="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  (change)="onLogoPicked($event)"
                  [disabled]="uploadingLogo()"
                />
              </label>
              @if (logoUrl()) {
                <button
                  type="button"
                  (click)="onLogoRemove()"
                  class="text-sm font-medium text-red-600 hover:underline"
                >Прибрати лого</button>
              }
            </div>
            @if (uploadingLogo()) {
              <span class="text-xs text-neutral-500">Завантаження…</span>
            }
          </div>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              [disabled]="!isDirty() || saving()"
              class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
            >
              @if (saving()) { Зберігаємо… } @else { Зберегти }
            </button>
            <button
              type="button"
              (click)="onReset()"
              [disabled]="!isDirty() || saving()"
              class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-neutral-100"
            >
              Скасувати
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class BrandingPage implements OnInit {
  private readonly settingsApi = inject(SettingsApi);
  private readonly branding = inject(BrandingService);
  private readonly storage = inject(CatalogStorageApi);
  private readonly toasts = inject(ToastService);

  protected readonly loading = signal<boolean>(true);
  protected readonly saving = signal<boolean>(false);
  protected readonly uploadingLogo = signal<boolean>(false);

  protected readonly studioName = signal<string>(FALLBACK_NAME);
  protected readonly primaryColor = signal<string>(FALLBACK_PRIMARY);
  protected readonly logoUrl = signal<string | null>(null);

  private original: AppSettings | null = null;

  protected readonly isDirty = computed(() => {
    const o = this.original;
    if (!o) return false;
    return (
      o.studio_name !== this.studioName() ||
      o.primary_color !== this.primaryColor() ||
      (o.logo_url ?? null) !== this.logoUrl()
    );
  });

  ngOnInit(): void {
    void this.loadCurrent();
  }

  private async loadCurrent(): Promise<void> {
    this.loading.set(true);
    try {
      const settings = await this.settingsApi.getAppSettings();
      this.applyToForm(settings);
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося завантажити налаштування'));
    } finally {
      this.loading.set(false);
    }
  }

  private applyToForm(settings: AppSettings | null): void {
    this.original = settings;
    this.studioName.set(settings?.studio_name ?? FALLBACK_NAME);
    this.primaryColor.set(settings?.primary_color ?? FALLBACK_PRIMARY);
    this.logoUrl.set(settings?.logo_url ?? null);
  }

  protected onStudioNameChange(value: string): void {
    this.studioName.set(value);
    this.previewToBranding();
  }

  protected onPrimaryColorChange(value: string): void {
    this.primaryColor.set(value);
    this.previewToBranding();
  }

  protected async onLogoPicked(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (target) target.value = '';
    if (!file) return;

    this.uploadingLogo.set(true);
    try {
      const { publicUrl } = await this.storage.uploadBrandingLogo(file);
      this.logoUrl.set(publicUrl);
      this.previewToBranding();
      this.toasts.success('Логотип оновлено локально. Не забудь зберегти.');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося завантажити лого'));
    } finally {
      this.uploadingLogo.set(false);
    }
  }

  protected onLogoRemove(): void {
    this.logoUrl.set(null);
    this.previewToBranding();
  }

  protected onReset(): void {
    this.applyToForm(this.original);
    this.previewToBranding();
  }

  protected async onSave(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.isDirty() || this.saving()) return;

    this.saving.set(true);
    try {
      const updated = await this.settingsApi.updateAppSettings({
        studio_name: this.studioName().trim() || FALLBACK_NAME,
        primary_color: this.primaryColor(),
        logo_url: this.logoUrl(),
      });
      this.applyToForm(updated);
      this.branding.setSettings(updated);
      this.toasts.success('Налаштування збережено');
    } catch (err: unknown) {
      this.toasts.error(toErrorMessage(err, 'Не вдалося зберегти налаштування'));
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Pushes current draft into BrandingService so the live header/document
   * reflect the change without persisting to the database.
   */
  private previewToBranding(): void {
    const base = this.original;
    const draft: AppSettings = {
      id: 1,
      studio_name: this.studioName().trim() || FALLBACK_NAME,
      primary_color: this.primaryColor(),
      logo_url: this.logoUrl(),
      created_at: base?.created_at ?? new Date(0).toISOString(),
    };
    this.branding.setSettings(draft);
  }
}
