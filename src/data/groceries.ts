import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';
import type { GroceryCategory, GroceryItem } from '../types/models';
import { cacheGet, cacheSet, enqueueAction, isOnline } from '../lib/offlineStore';

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
  dates: string[];
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
function groceryCacheKey(startIso: string, endIso: string): string {
  return `groceries:${startIso}:${endIso}`;
}

export async function getGroceryListForRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<GroceryList> {
  const cacheKey = groceryCacheKey(startIso, endIso);
  if (!isOnline()) {
    const cached = await cacheGet<GroceryList>(cacheKey);
    if (cached) return cached;
  }
  try {
    const list = await fetchGroceryListForRange(userId, startIso, endIso);
    await cacheSet(cacheKey, list);
    return list;
  } catch (err) {
    const cached = await cacheGet<GroceryList>(cacheKey);
    if (cached) return cached;
    throw err;
  }
}

async function fetchGroceryListForRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<GroceryList> {
  const { data: entries, error: entriesErr } = await supabase
    .from('planning_entries')
    .select('dish_id, date, servings')
    .gte('date', startIso)
    .lte('date', endIso)
    .not('dish_id', 'is', null);
  if (entriesErr) throw entriesErr;

  const dishOccurrences = (entries ?? []) as { dish_id: string; date: string; servings: number }[];
  const uniqueDishIds = Array.from(new Set(dishOccurrences.map((e) => e.dish_id)));

  const baseServingsById = new Map<string, number>();
  if (uniqueDishIds.length) {
    const { data: dishRows, error: dishErr } = await supabase.from('dishes').select('id, base_servings').in('id', uniqueDishIds);
    if (dishErr) throw dishErr;
    for (const d of dishRows ?? []) baseServingsById.set(d.id, d.base_servings || 1);
  }

  // Facteur d'échelle par plat = somme, sur toutes ses occurrences dans la
  // période, de (portions du repas planifié / portions de base de la recette).
  const scaleFactor = new Map<string, number>();
  const occurrenceDates = new Map<string, string[]>();
  for (const e of dishOccurrences) {
    const base = baseServingsById.get(e.dish_id) || 1;
    const factor = (e.servings || base) / base;
    scaleFactor.set(e.dish_id, (scaleFactor.get(e.dish_id) ?? 0) + factor);
    occurrenceDates.set(e.dish_id, [...(occurrenceDates.get(e.dish_id) ?? []), e.date]);
  }

  const merged = new Map<
    string,
    { name: string; unit: string; quantity: number; grocery_category: GroceryCategory; source_dish_ids: Set<string>; dates: Set<string> }
  >();

  if (uniqueDishIds.length) {
    const { data: ingredients, error: ingErr } = await supabase
      .from('ingredients')
      .select('*')
      .in('dish_id', uniqueDishIds);
    if (ingErr) throw ingErr;

    for (const ing of ingredients ?? []) {
      const factor = scaleFactor.get(ing.dish_id) ?? 1;
      const dates = occurrenceDates.get(ing.dish_id) ?? [];
      const key = mergeKey(ing.name, ing.unit);
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += Number(ing.quantity) * factor;
        existing.source_dish_ids.add(ing.dish_id);
        dates.forEach((d) => existing.dates.add(d));
      } else {
        merged.set(key, {
          name: ing.name,
          unit: ing.unit,
          quantity: Number(ing.quantity) * factor,
          grocery_category: ing.grocery_category,
          source_dish_ids: new Set([ing.dish_id]),
          dates: new Set(dates),
        });
      }
    }
  }

  const { data: ledgerAndManual, error: ledgerErr } = await supabase
    .from('grocery_items')
    .select('*');
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
    quantity: Math.round(m.quantity * 100) / 100,
    grocery_category: m.grocery_category,
    source_dish_ids: Array.from(m.source_dish_ids),
    dates: Array.from(m.dates).sort(),
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
  if (!isOnline()) {
    await enqueueAction('toggleAutoChecked', { userId, item, checked });
    return;
  }
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('grocery_items').upsert(
    {
      user_id: userId,
      household_id,
      name: item.name,
      unit: item.unit,
      grocery_category: item.grocery_category,
      quantity: item.quantity,
      manual: false,
      checked,
      merge_key: item.key,
      source_dish_ids: item.source_dish_ids,
    },
    { onConflict: 'household_id,merge_key' },
  );
  if (error) throw error;
}

export async function toggleManualChecked(id: string, checked: boolean): Promise<void> {
  if (!isOnline()) {
    await enqueueAction('toggleManualChecked', { id, checked });
    return;
  }
  const { error } = await supabase.from('grocery_items').update({ checked }).eq('id', id);
  if (error) throw error;
}

// Applique une action mise en file (appelé par flushGroceryQueue) en
// contournant la re-mise en file (on est forcément en ligne à cet instant).
export async function applyQueuedGroceryAction(type: string, payload: any): Promise<void> {
  if (type === 'toggleAutoChecked') {
    const household_id = await getMyHouseholdId(payload.userId);
    const item: ComputedGroceryItem = payload.item;
    const { error } = await supabase.from('grocery_items').upsert(
      {
        user_id: payload.userId,
        household_id,
        name: item.name,
        unit: item.unit,
        grocery_category: item.grocery_category,
        quantity: item.quantity,
        manual: false,
        checked: payload.checked,
        merge_key: item.key,
        source_dish_ids: item.source_dish_ids,
      },
      { onConflict: 'household_id,merge_key' },
    );
    if (error) throw error;
  } else if (type === 'toggleManualChecked') {
    const { error } = await supabase.from('grocery_items').update({ checked: payload.checked }).eq('id', payload.id);
    if (error) throw error;
  }
}

export async function addManualItem(
  userId: string,
  name: string,
  quantity: number,
  unit: string,
  grocery_category: GroceryCategory,
): Promise<void> {
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('grocery_items').insert({
    user_id: userId,
    household_id,
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
