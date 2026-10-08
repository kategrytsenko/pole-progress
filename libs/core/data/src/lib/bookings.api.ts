import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type { Booking, CancelBookingResult } from './models';

const BOOKING_COLUMNS = 'id, session_id, user_id, pass_id, status, created_at';

@Injectable({ providedIn: 'root' })
export class BookingsApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async listMine(): Promise<Booking[]> {
    const uid = await this.requireUid();

    const { data, error } = await this.client
      .from('bookings')
      .select(BOOKING_COLUMNS)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .returns<Booking[]>();

    if (error) throw error;
    return data ?? [];
  }

  async listForSession(sessionId: string): Promise<Booking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select(BOOKING_COLUMNS)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .returns<Booking[]>();

    if (error) throw error;
    return data ?? [];
  }

  /** Inserts the booking and spends one class. Capacity is enforced in Postgres. */
  async bookSession(sessionId: string): Promise<Booking> {
    const { data, error } = await this.client.rpc('book_session', {
      p_session_id: sessionId,
    });

    if (error) throw error;
    if (!isBooking(data)) throw new Error('book_session returned an unexpected payload');
    return data;
  }

  /** Cancels the booking. Credit is restored only when the RPC says so. */
  async cancelBooking(bookingId: string): Promise<CancelBookingResult> {
    const { data, error } = await this.client.rpc('cancel_booking', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    if (!isCancelPayload(data)) throw new Error('cancel_booking returned an unexpected payload');
    const { credit_restored, ...booking } = data;
    return { booking, creditRestored: credit_restored };
  }

  private async requireUid(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }
}

function isBooking(value: unknown): value is Booking {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row['id'] === 'string' &&
    typeof row['session_id'] === 'string' &&
    typeof row['user_id'] === 'string' &&
    typeof row['pass_id'] === 'string' &&
    (row['status'] === 'booked' || row['status'] === 'cancelled') &&
    typeof row['created_at'] === 'string'
  );
}

function isCancelPayload(value: unknown): value is Booking & { credit_restored: boolean } {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return isBooking(row) && typeof row['credit_restored'] === 'boolean';
}
