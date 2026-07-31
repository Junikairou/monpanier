import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';

export type TaxonomyKind = 'course_type' | 'category' | 'grocery_category';

export interface TaxonomyItem {
  id: string;
  household_id: string;
  key: string;
  label: string;
  icon: string | null;
  position: number;
}

const TABLE: Record<TaxonomyKind, string> = {
  course_type: 'course_types',
  category: 'dish_categories',
  grocery_category: 'grocery_categories',
};

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || `item_${Date.now()}`;
}

export async function listTaxonomy(kind: TaxonomyKind): Promise<TaxonomyItem[]> {
  const { data, error } = await supabase.from(TABLE[kind]).select('*').order('position');
  if (error) throw error;
  return data as TaxonomyItem[];
}

export async function createTaxonomyItem(
  kind: TaxonomyKind,
  userId: string,
  label: string,
  icon?: string,
): Promise<TaxonomyItem> {
  const household_id = await getMyHouseholdId(userId);
  const { count } = await supabase
    .from(TABLE[kind])
    .select('id', { count: 'exact', head: true })
    .eq('household_id', household_id);
  const { data, error } = await supabase
    .from(TABLE[kind])
    .insert({ household_id, key: slugify(label), label: label.trim(), icon: icon?.trim() || null, position: count ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data as TaxonomyItem;
}

export async function renameTaxonomyItem(kind: TaxonomyKind, id: string, label: string, icon?: string): Promise<void> {
  const patch: Record<string, unknown> = { label: label.trim() };
  if (icon !== undefined) patch.icon = icon.trim() || null;
  const { error } = await supabase.from(TABLE[kind]).update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteTaxonomyItem(kind: TaxonomyKind, id: string): Promise<void> {
  const { error } = await supabase.from(TABLE[kind]).delete().eq('id', id);
  if (error) throw error;
}

export async function swapTaxonomyPositions(
  kind: TaxonomyKind,
  a: { id: string; position: number },
  b: { id: string; position: number },
): Promise<void> {
  const { error: e1 } = await supabase.from(TABLE[kind]).update({ position: b.position }).eq('id', a.id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from(TABLE[kind]).update({ position: a.position }).eq('id', b.id);
  if (e2) throw e2;
}
