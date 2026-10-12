import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import { mapElementAttempt, type ElementAttemptRow } from './attempt-feedback';
import type {
  AttemptProgressRow,
  CreateAttemptInput,
  ElementAttempt,
  UpdateAttemptInput,
} from './models';

const ATTEMPT_COLUMNS = 'id, element_id, user_id, date, note, stage, created_at';
const PROGRESS_COLUMNS = 'element_id, stage, date, created_at';

@Injectable({ providedIn: 'root' })
export class AttemptsApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async listMyAttemptsForElement(elementId: string): Promise<ElementAttempt[]> {
    const uid = await this.requireUid();
    return this.queryAttemptsForElement(elementId, uid);
  }

  /**
   * Attempts for one element and one student.
   * An admin can read any diary. A peer receives rows only while that journal is public.
   */
  async listAttemptsForElement(elementId: string, userId: string): Promise<ElementAttempt[]> {
    await this.requireUid();
    return this.queryAttemptsForElement(elementId, userId);
  }

  /** Every attempt the current student has logged. The diary store keeps the latest stage per element. */
  async listMyProgressRows(): Promise<AttemptProgressRow[]> {
    const uid = await this.requireUid();
    return this.queryProgressRows(uid);
  }

  /** Stage rows for one student. An admin reads every diary. A peer receives rows only while that journal is public. */
  async listProgressRows(userId: string): Promise<AttemptProgressRow[]> {
    await this.requireUid();
    return this.queryProgressRows(userId);
  }

  async createAttempt(input: CreateAttemptInput): Promise<ElementAttempt> {
    const uid = await this.requireUid();

    const { data, error } = await this.client
      .from('element_attempts')
      .insert({
        element_id: input.elementId,
        user_id: uid,
        date: input.date,
        note: input.note ?? null,
        stage: input.stage,
      })
      .select(ATTEMPT_COLUMNS)
      .single<ElementAttemptRow>();

    if (error) throw error;
    if (!data) throw new Error('Attempt not found');
    return mapElementAttempt(data);
  }

  async updateAttempt(input: UpdateAttemptInput): Promise<ElementAttempt> {
    const uid = await this.requireUid();

    const { data, error } = await this.client
      .from('element_attempts')
      .update({
        date: input.date,
        note: input.note ?? null,
        stage: input.stage,
      })
      .eq('id', input.id)
      .eq('user_id', uid)
      .select(ATTEMPT_COLUMNS)
      .single<ElementAttemptRow>();

    if (error) throw error;
    if (!data) throw new Error('Attempt not found');
    return mapElementAttempt(data);
  }

  async deleteAttempt(id: string): Promise<void> {
    const { error } = await this.client
      .from('element_attempts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private async queryAttemptsForElement(
    elementId: string,
    userId: string,
  ): Promise<ElementAttempt[]> {
    const { data, error } = await this.client
      .from('element_attempts')
      .select(ATTEMPT_COLUMNS)
      .eq('element_id', elementId)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<ElementAttemptRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapElementAttempt);
  }

  private async queryProgressRows(userId: string): Promise<AttemptProgressRow[]> {
    const { data, error } = await this.client
      .from('element_attempts')
      .select(PROGRESS_COLUMNS)
      .eq('user_id', userId)
      .returns<AttemptProgressRow[]>();

    if (error) throw error;
    return data ?? [];
  }

  private async requireUid(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }
}
