export type UserRole = 'admin' | 'instructor' | 'student';
export type MediaType = 'image' | 'video';

export function isInstructor(role: UserRole | null | undefined): boolean {
  return role === 'instructor';
}

export function isStaff(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'instructor';
}

export interface Profile {
  id: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export interface AppSettings {
  id: 1;
  studio_name: string;
  logo_url: string | null;
  primary_color: string;
  default_capacity: number;
  cancel_cutoff_hours: number;
  created_at: string;
}

export interface ElementCategory {
  id: string;
  name: string;
  order: number;
  created_at: string;
}

export interface Element {
  id: string;
  category_id: string;
  name: string;
  image_url: string | null;
  order: number;
  created_at: string;
}

export interface ElementAttempt {
  id: string;
  element_id: string;
  user_id: string;
  date: string;
  note: string | null;
  created_at: string;
}

export interface MediaItem {
  id: string;
  attempt_id: string;
  type: MediaType;
  url: string;
  preview_url: string | null;
  created_at: string;
}

export interface CreateAttemptInput {
  elementId: string;
  date: string;
  note?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  order?: number;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  order?: number;
}

export interface CategoryOrderUpdate {
  id: string;
  order: number;
}

export interface CreateElementInput {
  category_id: string;
  name: string;
  image_url?: string | null;
  order?: number;
}

export interface UpdateElementInput {
  id: string;
  category_id?: string;
  name?: string;
  image_url?: string | null;
  order?: number;
}

export interface ElementOrderUpdate {
  id: string;
  order: number;
}

export interface UploadAndAttachInput {
  attemptId: string;
  file: File;
  type: MediaType;
}

export interface UpdateAppSettingsInput {
  studio_name?: string;
  logo_url?: string | null;
  primary_color?: string;
  default_capacity?: number;
  cancel_cutoff_hours?: number;
}

export type ClassSessionStatus = 'scheduled' | 'cancelled';
export type BookingStatus = 'booked' | 'cancelled';
export type ClientPassStatus = 'active' | 'exhausted' | 'expired' | 'revoked';

export interface ClassType {
  id: string;
  name: string;
  duration_min: number;
  default_capacity: number;
  active: boolean;
  created_at: string;
}

export interface ClassSession {
  id: string;
  type_id: string;
  instructor_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: ClassSessionStatus;
  created_at: string;
}

export interface SessionRange {
  from: string;
  to: string;
}

export interface PassProduct {
  id: string;
  name: string;
  class_count: number;
  validity_days: number;
  active: boolean;
  created_at: string;
}

export interface ClientPass {
  id: string;
  user_id: string;
  product_id: string;
  remaining: number;
  valid_from: string;
  valid_until: string;
  status: ClientPassStatus;
  created_at: string;
}

export interface Booking {
  id: string;
  session_id: string;
  user_id: string;
  pass_id: string;
  status: BookingStatus;
  created_at: string;
}

/** Session row plus the fields the calendar needs and RLS would hide. */
export interface ClassSessionCard {
  id: string;
  type_id: string;
  type_name: string;
  instructor_id: string;
  instructor_name: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count: number;
  status: ClassSessionStatus;
  created_at: string;
}

export interface CancelBookingResult {
  booking: Booking;
  creditRestored: boolean;
}
