import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { CreateAttemptInput, ElementAttempt } from './models';

const ATTEMPT_COLUMNS = 'id, element_id, user_id, date, note, created_at';

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

  /**
   * One-shot lookup of element_ids the current user has at least one attempt for.
   * Returned as a Set for O(1) "is done" checks in the dashboard.
   */
  async getMyDoneElementIds(): Promise<Set<string>> {
    const uid = await this.requireUid();

    const { data, error } = await this.client
      .from('element_attempts')
      .select('element_id')
      .eq('user_id', uid)
      .returns<Pick<ElementAttempt, 'element_id'>[]>();

    if (error) throw error;
    return new Set((data ?? []).map((row) => row.element_id));
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
