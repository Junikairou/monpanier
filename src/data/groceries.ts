import { supabase } from '../lib/supabase';
import type { GroceryCategory, GroceryItem } from '../types/models';

export async function listGroceries(userId: string): Promise<GroceryItem[]> {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data as GroceryItem[];
}

export async function toggleChecked(id: string, checked: boolean): Promise<void> {
  const { error } = await supabase.from('grocery_items').update({ checked }).eq('id', id);
  if (error) throw error;
}

export async function deleteGroceryItem(id: string): Promise<void> {
  const { error } = await supabase.from('grocery_items').delete().eq('id', id);
  if (error) throw error;
}

export async function addManualItem(
  userId: string,
  name: string,
  quantity: number,
  unit: string,
  grocery_category: GroceryCategory,
): Promise<void> {
  const { error } = await supabase.from('grocery_items').insert({
    user_id: userId,
    name,
    quantity,
    unit,
    grocery_category,
    manual: true,
    checked: false,
    source_dish_ids: [],
  });
  if (error) throw error;
}

/**
 * Recompute every auto-generated grocery item from the current planning.
 * Ingredients sharing the same name + unit across dishes are summed into
 * one line, keeping track of which dishes contributed to it. Manually
 * added items are left untouched.
 */
export async function regenerateGroceriesFromPlanning(userId: string): Promise<void> {
  const { data: entries, error: entriesErr } = await supabase
    .from('planning_entries')
    .select('dish_id')
    .eq('user_id', userId)
    .not('dish_id', 'is', null);
  if (entriesErr) throw entriesErr;

  const dishIds = Array.from(new Set((entries ?? []).map((e) => e.dish_id as string)));

  type Merged = {
    name: string;
    unit: string;
    quantity: number;
    grocery_category: GroceryCategory;
    source_dish_ids: Set<string>;
  };
  const merged = new Map<string, Merged>();

  if (dishIds.length) {
    const { data: ingredients, error: ingErr } = await supabase
      .from('ingredients')
      .select('*')
      .in('dish_id', dishIds);
    if (ingErr) throw ingErr;

    for (const ing of ingredients ?? []) {
      const key = `${ing.name.trim().toLowerCase()}::${ing.unit.trim().toLowerCase()}`;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += Number(ing.quantity);
        existing.source_dish_ids.add(ing.dish_id);
      } else {
        merged.set(key, {
          name: ing.name,
          unit: ing.unit,
          quantity: Number(ing.quantity),
          grocery_category: ing.grocery_category,
          source_dish_ids: new Set([ing.dish_id]),
        });
      }
    }
  }

  const { error: delErr } = await supabase
    .from('grocery_items')
    .delete()
    .eq('user_id', userId)
    .eq('manual', false);
  if (delErr) throw delErr;

  const rows = Array.from(merged.values()).map((m) => ({
    user_id: userId,
    name: m.name,
    quantity: m.quantity,
    unit: m.unit,
    grocery_category: m.grocery_category,
    manual: false,
    checked: false,
    source_dish_ids: Array.from(m.source_dish_ids),
  }));

  if (rows.length) {
    const { error: insErr } = await supabase.from('grocery_items').insert(rows);
    if (insErr) throw insErr;
  }
}
