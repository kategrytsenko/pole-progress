import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { MediaItem, UploadAndAttachInput } from './models';

const MEDIA_BUCKET = 'media';
const MEDIA_COLUMNS = 'id, attempt_id, type, url, preview_url, created_at';
const DEFAULT_SIGNED_URL_TTL = 60 * 60; // 1 hour

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async listForAttempt(attemptId: string): Promise<MediaItem[]> {
    const { data, error } = await this.client
      .from('media')
      .select(MEDIA_COLUMNS)
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })
      .returns<MediaItem[]>();

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Uploads a file to storage and inserts a corresponding row in public.media.
   *
   * Storage path is derived from the authenticated user to satisfy the
   * `user/{uid}/...` RLS prefix policy on the private `media` bucket.
   *
   * The DB row stores the storage path (not a URL) — display callers must
   * resolve it via `getSignedUrl()`.
   *
   * On insert failure, the uploaded object is best-effort cleaned up so we
   * don't leak orphans.
   */
  async uploadAndAttach(input: UploadAndAttachInput): Promise<MediaItem> {
    const uid = await this.requireUid();
    const path = this.buildPath(uid, input.attemptId, input.file);

    const { error: uploadError } = await this.client.storage
      .from(MEDIA_BUCKET)
      .upload(path, input.file, {
        contentType: input.file.type || undefined,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data, error: insertError } = await this.client
      .from('media')
      .insert({
        attempt_id: input.attemptId,
        type: input.type,
        url: path,
        preview_url: null,
      })
      .select(MEDIA_COLUMNS)
      .single<MediaItem>();

    if (insertError) {
      await this.client.storage.from(MEDIA_BUCKET).remove([path]);
      throw insertError;
    }

    return data;
  }

  async getSignedUrl(path: string, expiresIn = DEFAULT_SIGNED_URL_TTL): Promise<string> {
    const { data, error } = await this.client.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Signed URL not returned');
    return data.signedUrl;
  }

  /**
   * Deletes the DB row first (RLS-checked), then the storage object.
   * If the storage delete fails the DB row is already gone — acceptable
   * for MVP; orphaned blobs can be GC'd later.
   */
  async delete(mediaId: string): Promise<void> {
    const { data, error } = await this.client
      .from('media')
      .delete()
      .eq('id', mediaId)
      .select('url')
      .maybeSingle<Pick<MediaItem, 'url'>>();

    if (error) throw error;

    const path = data?.url;
    if (!path) return;

    const { error: storageError } = await this.client.storage
      .from(MEDIA_BUCKET)
      .remove([path]);

    if (storageError) throw storageError;
  }

  private buildPath(uid: string, attemptId: string, file: File): string {
    const safeName = this.sanitizeFilename(file.name);
    const stamp = Date.now();
    return `user/${uid}/attempt/${attemptId}/${stamp}-${safeName}`;
  }

  private sanitizeFilename(name: string): string {
    const trimmed = name.trim() || 'file';
    return trimmed.replace(/[^A-Za-z0-9._-]+/g, '_');
  }

  private async requireUid(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }
}
