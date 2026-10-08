import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { AttemptProgressRow, CreateAttemptInput, ElementAttempt } from './models';

const ATTEMPT_COLUMNS = 'id, element_id, user_id, date, note, stage, created_at';
const PROGRESS_COLUMNS = 'element_id, stage, date, created_at';

@Injectable({ providedIn: 'root' })
export class AttemptsApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async listMyAttemptsForElement(elementId: string): Promise<ElementAttempt[]> {
    const uid = await this.requireUid();

    const { data, error } = await this.client
      .from('element_attempts')
      .select(ATTEMPT_COLUMNS)
      .eq('element_id', elementId)
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<ElementAttempt[]>();

    if (error) throw error;
    return data ?? [];
  }

  /** Every attempt the current student has logged. The diary store keeps the latest stage per element. */
  async listMyProgressRows(): Promise<AttemptProgressRow[]> {
    const uid = await this.requireUid();

    const { data, error } = await this.client
      .from('element_attempts')
      .select(PROGRESS_COLUMNS)
      .eq('user_id', uid)
      .returns<AttemptProgressRow[]>();

    if (error) throw error;
    return data ?? [];
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
      .single<ElementAttempt>();

    if (error) throw error;
    return data;
  }

  async deleteAttempt(id: string): Promise<void> {
    const { error } = await this.client
      .from('element_attempts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private async requireUid(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }
}
