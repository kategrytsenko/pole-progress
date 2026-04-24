import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import type {
  CategoryOrderUpdate,
  CreateCategoryInput,
  CreateElementInput,
  Element,
  ElementCategory,
  ElementOrderUpdate,
  UpdateCategoryInput,
  UpdateElementInput,
} from './models';

const CATEGORY_COLUMNS = 'id, name, order, created_at';
const ELEMENT_COLUMNS = 'id, category_id, name, image_url, order, created_at';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async getCategories(): Promise<ElementCategory[]> {
    const { data, error } = await this.client
      .from('element_categories')
      .select(CATEGORY_COLUMNS)
      .order('order', { ascending: true })
      .returns<ElementCategory[]>();

    if (error) throw error;
    return data ?? [];
  }

  async getElementsByCategory(categoryId: string): Promise<Element[]> {
    const { data, error } = await this.client
      .from('elements')
      .select(ELEMENT_COLUMNS)
      .eq('category_id', categoryId)
      .order('order', { ascending: true })
      .returns<Element[]>();

    if (error) throw error;
    return data ?? [];
  }

  async getAllElements(): Promise<Element[]> {
    const { data, error } = await this.client
      .from('elements')
      .select(ELEMENT_COLUMNS)
      .order('category_id', { ascending: true })
      .order('order', { ascending: true })
      .returns<Element[]>();

    if (error) throw error;
    return data ?? [];
  }

  async getElement(id: string): Promise<Element | null> {
    const { data, error } = await this.client
      .from('elements')
      .select(ELEMENT_COLUMNS)
      .eq('id', id)
      .maybeSingle<Element>();

    if (error) throw error;
    return data ?? null;
  }

  async createCategory(input: CreateCategoryInput): Promise<ElementCategory> {
    const { data, error } = await this.client
      .from('element_categories')
      .insert({ name: input.name, order: input.order ?? 0 })
      .select(CATEGORY_COLUMNS)
      .single<ElementCategory>();

    if (error) throw error;
    return data;
  }

  async updateCategory(input: UpdateCategoryInput): Promise<ElementCategory> {
    const { id, ...patch } = input;
    const { data, error } = await this.client
      .from('element_categories')
      .update(patch)
      .eq('id', id)
      .select(CATEGORY_COLUMNS)
      .single<ElementCategory>();

    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client
      .from('element_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async reorderCategories(updates: CategoryOrderUpdate[]): Promise<void> {
    if (updates.length === 0) return;

    const results = await Promise.all(
      updates.map((u) =>
        this.client
          .from('element_categories')
          .update({ order: u.order })
          .eq('id', u.id),
      ),
    );

    const failure = results.find((r) => r.error);
    if (failure?.error) throw failure.error;
  }

  async createElement(input: CreateElementInput): Promise<Element> {
    const { data, error } = await this.client
      .from('elements')
      .insert({
        category_id: input.category_id,
        name: input.name,
        image_url: input.image_url ?? null,
        order: input.order ?? 0,
      })
      .select(ELEMENT_COLUMNS)
      .single<Element>();

    if (error) throw error;
    return data;
  }

  async updateElement(input: UpdateElementInput): Promise<Element> {
    const { id, ...patch } = input;
    const { data, error } = await this.client
      .from('elements')
      .update(patch)
      .eq('id', id)
      .select(ELEMENT_COLUMNS)
      .single<Element>();

    if (error) throw error;
    return data;
  }

  async deleteElement(id: string): Promise<void> {
    const { error } = await this.client.from('elements').delete().eq('id', id);
    if (error) throw error;
  }

  async reorderElements(updates: ElementOrderUpdate[]): Promise<void> {
    if (updates.length === 0) return;

    const results = await Promise.all(
      updates.map((u) =>
        this.client.from('elements').update({ order: u.order }).eq('id', u.id),
      ),
    );

    const failure = results.find((r) => r.error);
    if (failure?.error) throw failure.error;
  }
}
