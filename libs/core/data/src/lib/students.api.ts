import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';

/** A client profile. Staff can list every student; this project is one studio. */
export interface StudioStudent {
  id: string;
  name: string | null;
  created_at: string;
}

interface ProfileStudentRow {
  id: string;
  name: string | null;
  role: string;
  created_at: string;
}

export function studentLabel(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : 'Без імені';
}

@Injectable({ providedIn: 'root' })
export class StudentsApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  /** RLS returns every student for staff, and only the caller's own row otherwise. */
  async listStudents(): Promise<StudioStudent[]> {
    await this.requireUid();

    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, created_at')
      .eq('role', 'student')
      .order('name', { ascending: true, nullsFirst: false })
      .returns<StudioStudent[]>();

    if (error) throw error;
    return data ?? [];
  }

  async getStudent(id: string): Promise<StudioStudent> {
    await this.requireUid();

    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, role, created_at')
      .eq('id', id)
      .maybeSingle<ProfileStudentRow>();

    if (error) throw error;
    if (!data || data.role !== 'student') throw new Error('Student not found');

    return {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
    };
  }

  private async requireUid(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }
}
