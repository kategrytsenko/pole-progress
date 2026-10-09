import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import {
  instructorNoteBody,
  mapElementAttempt,
  readInstructorFeedback,
  type ElementAttemptRow,
} from './attempt-feedback';
import type {
  AttemptInstructorFeedback,
  AttemptProgressRow,
  CreateAttemptInput,
  ElementAttempt,
  UpdateAttemptInput,
  UpsertInstructorFeedbackInput,
} from './models';

const ATTEMPT_COLUMNS =
  'id, element_id, user_id, date, note, stage, created_at, attempt_instructor_notes(author_id, body, updated_at, author:profiles(name))';
const NOTE_COLUMNS = 'author_id, body, updated_at, author:profiles(name)';
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
   * Staff can read any diary. A peer receives rows only while that journal is public.
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

  /** Stage rows for one student. Staff read every diary. A peer receives rows only while that journal is public. */
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

  /** Staff-only. RLS rejects the write when the caller is not staff. */
  async upsertInstructorFeedback(
    input: UpsertInstructorFeedbackInput,
  ): Promise<AttemptInstructorFeedback> {
    const uid = await this.requireUid();
    const body = instructorNoteBody(input.body);

    const { data, error } = await this.client
      .from('attempt_instructor_notes')
      .upsert(
        {
          attempt_id: input.attemptId,
          author_id: uid,
          body,
        },
        { onConflict: 'attempt_id' },
      )
      .select(NOTE_COLUMNS)
      .single();

    if (error) throw error;
    const feedback = readInstructorFeedback(data);
    if (!feedback) throw new Error('Instructor note was not saved');
    return feedback;
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
