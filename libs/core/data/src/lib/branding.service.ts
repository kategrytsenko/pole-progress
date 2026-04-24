import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  type Signal,
} from '@angular/core';
import type { AppSettings } from './models';
import { SettingsApi } from './settings.api';

const DEFAULT_STUDIO_NAME = 'Pole Studio';
const DEFAULT_PRIMARY = '#7C3AED';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly settingsApi = inject(SettingsApi);
  private readonly settingsSignal = signal<AppSettings | null>(null);

  readonly settings: Signal<AppSettings | null> = this.settingsSignal.asReadonly();
  readonly studioName = computed(() => this.settingsSignal()?.studio_name ?? DEFAULT_STUDIO_NAME);
  readonly logoUrl = computed(() => this.settingsSignal()?.logo_url ?? null);
  readonly primaryColor = computed(() => this.settingsSignal()?.primary_color ?? DEFAULT_PRIMARY);

  constructor() {
    effect(() => {
      const settings = this.settingsSignal();
      if (!settings) return;
      this.applyToDocument(settings);
    });
  }

  /**
   * Loads app branding from `app_settings` and updates the signal.
   * Failures are swallowed (e.g. anonymous user on /sign-in where the row
   * isn't readable yet under RLS) — UI falls back to defaults.
   */
  async load(): Promise<void> {
    try {
      const settings = await this.settingsApi.getAppSettings();
      this.settingsSignal.set(settings);
    } catch {
      this.settingsSignal.set(null);
    }
  }

  /**
   * Optimistically replaces the in-memory settings (used by the admin
   * branding editor for live preview before persistence completes).
   */
  setSettings(settings: AppSettings | null): void {
    this.settingsSignal.set(settings);
  }

  private applyToDocument(settings: AppSettings): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (settings.primary_color) {
      root.style.setProperty('--pp-primary', settings.primary_color);
      root.style.setProperty('--pp-primary-600', settings.primary_color);
    }

    if (settings.studio_name) {
      document.title = settings.studio_name;
    }
  }
}
