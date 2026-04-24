export type UserRole = 'admin' | 'student';
export type MediaType = 'image' | 'video';

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
}
