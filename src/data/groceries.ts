import { supabase } from '../lib/supabase';
import type { GroceryCategory, GroceryItem } from '../types/models';

function mergeKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

export interface ComputedGroceryItem {
  key: string;
  name: string;
  unit: string;
  quantity: number;
  grocery_category: GroceryCategory;
  source_dish_ids: string[];
  checked: boolean;
}

export interface GroceryList {
  auto: ComputedGroceryItem[];
  manual: GroceryItem[];
}

/**
 * Computes the grocery list for a date range directly from the planning +
 * ingredients tables (not stored), so switching between "day" and "week"
 * views always reflects exactly what's planned in that window. Only the
 * checked state persists across views, keyed by ingredient name+unit.
 */
export async function getGroceryListForRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<GroceryList> {
  const { data: entries, error: entriesErr } = await supabase
    .from('planning_entries')
    .select('dish_id')
    .eq('user_id', userId)
    .gte('date', startIso)
    .lte('date', endIso)
    .not('dish_id', 'is', null);
  if (entriesErr) throw entriesErr;

  const dishOccurrences = (entries ?? []).map((e) => e.dish_id as string);
  const uniqueDishIds = Array.from(new Set(dishOccurrences));
  const occurrenceCount = new Map<string, number>();
  for (const id of dishOccurrences) occurrenceCount.set(id, (occurrenceCount.get(id) ?? 0) + 1);

  const merged = new Map<
    string,
    { name: string; unit: string; quantity: number; grocery_category: GroceryCategory; source_dish_ids: Set<string> }
  >();

  if (uniqueDishIds.length) {
    const { data: ingredients, error: ingErr } = await supabase
      .from('ingredients')
      .select('*')
      .in('dish_id', uniqueDishIds);
    if (ingErr) throw ingErr;

    for (const ing of ingredients ?? []) {
      const times = occurrenceCount.get(ing.dish_id) ?? 1;
      const key = mergeKey(ing.name, ing.unit);
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += Number(ing.quantity) * times;
        existing.source_dish_ids.add(ing.dish_id);
      } else {
        merged.set(key, {
          name: ing.name,
          unit: ing.unit,
          quantity: Number(ing.quantity) * times,
          grocery_category: ing.grocery_category,
          source_dish_ids: new Set([ing.dish_id]),
        });
      }
    }
  }

  const { data: ledgerAndManual, error: ledgerErr } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('user_id', userId);
  if (ledgerErr) throw ledgerErr;

  const checkedByKey = new Map<string, boolean>();
  const manual: GroceryItem[] = [];
  for (const row of ledgerAndManual ?? []) {
    if (row.manual) manual.push(row as GroceryItem);
    else if (row.merge_key) checkedByKey.set(row.merge_key, row.checked);
  }

  const auto: ComputedGroceryItem[] = Array.from(merged.entries()).map(([key, m]) => ({
    key,
    name: m.name,
    unit: m.unit,
    quantity: m.quantity,
    grocery_category: m.grocery_category,
    source_dish_ids: Array.from(m.source_dish_ids),
    checked: checkedByKey.get(key) ?? false,
  }));
  auto.sort((a, b) => a.name.localeCompare(b.name));

  return { auto, manual };
}

export async function toggleAutoChecked(
  userId: string,
  item: ComputedGroceryItem,
  checked: boolean,
): Promise<void> {
  const { error } = await supabase.from('grocery_items').upsert(
    {
      user_id: userId,
      name: item.name,
      unit: item.unit,
      grocery_category: item.grocery_category,
      quantity: item.quantity,
      manual: false,
      checked,
      merge_key: item.key,
      source_dish_ids: item.source_dish_ids,
    },
    { onConflict: 'user_id,merge_key' },
  );
  if (error) throw error;
}

export async function toggleManualChecked(id: string, checked: boolean): Promise<void> {
  const { error } = await supabase.from('grocery_items').update({ checked }).eq('id', id);
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
