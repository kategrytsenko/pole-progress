import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { ClassSession, ClassSessionCard, ClassType, SessionRange } from './models';
import {
  classTypeWrite,
  newSessionInsert,
  sessionCancelPatch,
  sessionWrite,
  sessionWriteErrorMessage,
  type ClassTypeDraft,
  type SessionDraft,
} from './session-admin';

const CLASS_TYPE_COLUMNS = 'id, name, duration_min, default_capacity, active, created_at';
const SESSION_COLUMNS = 'id, type_id, instructor_id, starts_at, ends_at, capacity, status, created_at';

@Injectable({ providedIn: 'root' })
export class ScheduleApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async listClassTypes(): Promise<ClassType[]> {
    const { data, error } = await this.client
      .from('class_types')
      .select(CLASS_TYPE_COLUMNS)
      .order('name', { ascending: true })
      .returns<ClassType[]>();

    if (error) throw error;
    return data ?? [];
  }

  async listSessionsInRange(
    range: SessionRange,
    typeId?: string | null,
  ): Promise<ClassSessionCard[]> {
    const { data, error } = await this.client.rpc('list_sessions_in_range', {
      p_from: range.from,
      p_to: range.to,
      p_type_id: typeId || null,
    });

    if (error) throw error;
    return parseSessionCards(data);
  }

  async getSession(id: string): Promise<ClassSessionCard | null> {
    const { data, error } = await this.client.rpc('get_session_card', { p_id: id }).maybeSingle();

    if (error) throw error;
    const cards = parseSessionCards(data === null ? [] : [data]);
    return cards[0] ?? null;
  }

  async createClassType(draft: ClassTypeDraft): Promise<ClassType> {
    const row = unwrap(classTypeWrite(draft));
    const { data, error } = await this.client
      .from('class_types')
      .insert(row)
      .select(CLASS_TYPE_COLUMNS)
      .single<ClassType>();

    if (error) throw writeError(error, 'Не вдалося зберегти тип заняття.');
    return data;
  }

  async updateClassType(id: string, draft: ClassTypeDraft): Promise<ClassType> {
    const row = unwrap(classTypeWrite(draft));
    const { data, error } = await this.client
      .from('class_types')
      .update(row)
      .eq('id', id)
      .select(CLASS_TYPE_COLUMNS)
      .single<ClassType>();

    if (error) throw writeError(error, 'Не вдалося зберегти тип заняття.');
    return data;
  }

  async createSession(draft: SessionDraft): Promise<ClassSession> {
    const row = unwrap(newSessionInsert(draft));
    const { data, error } = await this.client
      .from('class_sessions')
      .insert(row)
      .select(SESSION_COLUMNS)
      .single<ClassSession>();

    if (error) throw writeError(error, 'Не вдалося зберегти заняття.');
    return data;
  }

  /**
   * Updates type, instructor, time, and capacity. Status is unchanged.
   * `activeBookings` is the current count of bookings with status `booked`.
   */
  async updateSession(id: string, draft: SessionDraft, activeBookings: number): Promise<ClassSession> {
    const row = unwrap(sessionWrite(draft, activeBookings));
    const { data, error } = await this.client
      .from('class_sessions')
      .update(row)
      .eq('id', id)
      .select(SESSION_COLUMNS)
      .single<ClassSession>();

    if (error) throw writeError(error, 'Не вдалося зберегти заняття.');
    return data;
  }

  /** Sets status to cancelled. Does not delete bookings or change pass credits. */
  async cancelSession(id: string): Promise<ClassSession> {
    const { data, error } = await this.client
      .from('class_sessions')
      .update(sessionCancelPatch())
      .eq('id', id)
      .select(SESSION_COLUMNS)
      .single<ClassSession>();

    if (error) throw writeError(error, 'Не вдалося скасувати заняття.');
    return data;
  }
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function writeError(error: unknown, fallback: string): Error {
  return new Error(sessionWriteErrorMessage(error, fallback));
}

function parseSessionCards(value: unknown): ClassSessionCard[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isClassSessionCard);
}

function isClassSessionCard(value: unknown): value is ClassSessionCard {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row['id'] === 'string' &&
    typeof row['type_id'] === 'string' &&
    typeof row['type_name'] === 'string' &&
    typeof row['instructor_id'] === 'string' &&
    (typeof row['instructor_name'] === 'string' || row['instructor_name'] === null) &&
    typeof row['starts_at'] === 'string' &&
    typeof row['ends_at'] === 'string' &&
    typeof row['capacity'] === 'number' &&
    typeof row['booked_count'] === 'number' &&
    (row['status'] === 'scheduled' || row['status'] === 'cancelled') &&
    typeof row['created_at'] === 'string'
  );
}
