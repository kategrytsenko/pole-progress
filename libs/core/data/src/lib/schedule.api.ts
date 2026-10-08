import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { ClassSessionCard, ClassType, SessionRange } from './models';

const CLASS_TYPE_COLUMNS = 'id, name, duration_min, default_capacity, active, created_at';

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
