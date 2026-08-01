import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';

export interface CatalogIngredient {
  id: string;
  household_id: string;
  name: string;
  grocery_category: string;
  default_unit: string | null;
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
