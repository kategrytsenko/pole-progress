import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';

const CATALOG_BUCKET = 'catalog';

export interface UploadResult {
  readonly path: string;
  readonly publicUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogStorageApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  uploadElementImage(elementId: string, file: File): Promise<UploadResult> {
    return this.upload(`element/${elementId}/${this.timestampedName(file)}`, file);
  }

  uploadBrandingLogo(file: File): Promise<UploadResult> {
    return this.upload(`branding/${this.timestampedName(file)}`, file);
  }

  /**
   * Best-effort cleanup helper used when replacing an image — the old
   * object is removed only if it's hosted in our catalog bucket; external
   * URLs are ignored.
   */
  async removeByPublicUrl(publicUrl: string | null | undefined): Promise<void> {
    if (!publicUrl) return;
    const path = this.extractPath(publicUrl);
    if (!path) return;
    await this.client.storage.from(CATALOG_BUCKET).remove([path]);
  }

  private async upload(path: string, file: File): Promise<UploadResult> {
    const { error } = await this.client.storage
      .from(CATALOG_BUCKET)
      .upload(path, file, {
        contentType: file.type || undefined,
        upsert: true,
      });
    if (error) throw error;

    const { data } = this.client.storage.from(CATALOG_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Public URL not returned');
    return { path, publicUrl: data.publicUrl };
  }

  private timestampedName(file: File): string {
    const safeName = (file.name.trim() || 'file').replace(/[^A-Za-z0-9._-]+/g, '_');
    return `${Date.now()}-${safeName}`;
  }

  private extractPath(publicUrl: string): string | null {
    const marker = `/storage/v1/object/public/${CATALOG_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  }
}
