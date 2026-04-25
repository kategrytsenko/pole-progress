import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BrandingService } from '@org/data';

@Injectable({ providedIn: 'root' })
export class PpTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly branding = inject(BrandingService);
  private currentRouteTitle: string | null = null;

  constructor() {
    super();
    effect(() => {
      const studio = this.branding.studioName();
      this.title.setTitle(this.compose(this.currentRouteTitle, studio));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.currentRouteTitle = this.buildTitle(snapshot) ?? null;
    this.title.setTitle(this.compose(this.currentRouteTitle, this.branding.studioName()));
  }

  private compose(route: string | null, studio: string): string {
    if (!route) return studio;
    if (!studio) return route;
    return `${route} — ${studio}`;
  }
}
