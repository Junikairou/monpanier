import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';

export interface CatalogIngredient {
  id: string;
  household_id: string;
  name: string;
  grocery_category: string;
  default_unit: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
}

export interface CatalogIngredientPatch {
  name?: string;
  grocery_category?: string;
  default_unit?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
}

export async function listCatalogIngredients(): Promise<CatalogIngredient[]> {
  const { data, error } = await supabase.from('ingredients_catalog').select('*').order('name');
  if (error) throw error;
  return data as CatalogIngredient[];
}

export async function ensureCatalogIngredient(
  userId: string,
  name: string,
  groceryCategory: string,
  defaultUnit?: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase
    .from('ingredients_catalog')
    .insert({ household_id, name: trimmed, grocery_category: groceryCategory, default_unit: defaultUnit || null })
    .select()
    .single();
  // Ignore le conflit si l'article existe déjà (contrainte unique household_id+name)
  if (error && error.code !== '23505') throw error;
}

export async function createCatalogIngredient(userId: string, patch: CatalogIngredientPatch): Promise<CatalogIngredient> {
  const household_id = await getMyHouseholdId(userId);
  const { data, error } = await supabase
    .from('ingredients_catalog')
    .insert({ household_id, grocery_category: 'autre', ...patch, name: (patch.name ?? '').trim() })
    .select()
    .single();
  if (error) throw error;
  return data as CatalogIngredient;
}

export async function updateCatalogIngredient(id: string, patch: CatalogIngredientPatch): Promise<void> {
  const clean = { ...patch };
  if (clean.name !== undefined) clean.name = clean.name.trim();
  const { error } = await supabase.from('ingredients_catalog').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteCatalogIngredient(id: string): Promise<void> {
  const { error } = await supabase.from('ingredients_catalog').delete().eq('id', id);
  if (error) throw error;
}
