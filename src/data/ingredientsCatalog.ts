import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';
import { isGuestModeSync, isGuestUserId } from '../lib/guest';

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
  if (isGuestModeSync()) return [];
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
  if (isGuestUserId(userId)) return;
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
  if (isGuestUserId(userId)) {
    // Pas de catalogue d'ingrédients partagé en mode invité : renvoie un
    // objet local, non persisté (les infos nutrition restent sur l'ingrédient
    // du plat, saisies directement dans le formulaire).
    return {
      id: `guest:${Date.now()}`,
      household_id: userId,
      grocery_category: 'autre',
      name: (patch.name ?? '').trim(),
      default_unit: patch.default_unit ?? null,
      calories: patch.calories ?? null,
      protein_g: patch.protein_g ?? null,
      carbs_g: patch.carbs_g ?? null,
      fat_g: patch.fat_g ?? null,
      fiber_g: patch.fiber_g ?? null,
      ...patch,
    };
  }
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
  if (id.startsWith('guest:')) return;
  const clean = { ...patch };
  if (clean.name !== undefined) clean.name = clean.name.trim();
  const { error } = await supabase.from('ingredients_catalog').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteCatalogIngredient(id: string): Promise<void> {
  if (id.startsWith('guest:')) return;
  const { error } = await supabase.from('ingredients_catalog').delete().eq('id', id);
  if (error) throw error;
}
