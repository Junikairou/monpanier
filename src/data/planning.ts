import { supabase } from '../lib/supabase';
import { addDays, toIso } from '../lib/dates';
import { getMyHouseholdId } from './household';
import type { Dish, MealSlot, PlanningEntry } from '../types/models';

export type CopyMode = 'replace' | 'add';

export async function listPlanningRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<PlanningEntry[]> {
  const { data, error } = await supabase
    .from('planning_entries')
    .select('*, dish:dishes(*)')
    .gte('date', startIso)
    .lte('date', endIso)
    .order('date');
  if (error) throw error;
  return data as unknown as PlanningEntry[];
}

export async function setMeal(
  userId: string,
  date: string,
  slot: MealSlot,
  dish: Dish,
): Promise<void> {
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('planning_entries').insert({
    user_id: userId,
    household_id,
    date,
    slot,
    dish_id: dish.id,
  });
  if (error) throw error;
}

export async function setRestaurantMeal(userId: string, date: string, slot: MealSlot): Promise<void> {
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('planning_entries').insert({
    user_id: userId,
    household_id,
    date,
    slot,
    dish_id: null,
    is_restaurant: true,
  });
  if (error) throw error;
}

export async function replaceMeal(
  userId: string,
  entryId: string,
  dish: Dish,
): Promise<void> {
  const { error } = await supabase
    .from('planning_entries')
    .update({ dish_id: dish.id })
    .eq('id', entryId);
  if (error) throw error;
}

export async function removeMeal(userId: string, entryId: string): Promise<void> {
  const { error } = await supabase.from('planning_entries').delete().eq('id', entryId);
  if (error) throw error;
}

export async function setCooked(entryId: string, cooked: boolean): Promise<void> {
  const { error } = await supabase.from('planning_entries').update({ is_cooked: cooked }).eq('id', entryId);
  if (error) throw error;
}

export async function hasEntriesInRange(userId: string, startIso: string, endIso: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('planning_entries')
    .select('id', { count: 'exact', head: true })
    .gte('date', startIso)
    .lte('date', endIso);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function copyDay(
  userId: string,
  fromIso: string,
  toDate: string,
  mode: CopyMode,
): Promise<void> {
  if (fromIso === toDate) return;
  const [source, household_id] = await Promise.all([listPlanningRange(userId, fromIso, fromIso), getMyHouseholdId(userId)]);
  if (mode === 'replace') {
    const { error } = await supabase.from('planning_entries').delete().eq('household_id', household_id).eq('date', toDate);
    if (error) throw error;
  }
  if (source.length === 0) return;
  const rows = source.map((e) => ({
    user_id: userId,
    household_id,
    date: toDate,
    slot: e.slot,
    dish_id: e.dish_id,
    is_restaurant: e.is_restaurant,
  }));
  const { error } = await supabase.from('planning_entries').insert(rows);
  if (error) throw error;
}

export async function copyWeek(
  userId: string,
  fromWeekStartIso: string,
  toWeekStartIso: string,
  mode: CopyMode,
): Promise<void> {
  if (fromWeekStartIso === toWeekStartIso) return;
  const fromStart = new Date(fromWeekStartIso);
  const toStart = new Date(toWeekStartIso);
  const fromEnd = toIso(addDays(fromStart, 6));
  const toEnd = toIso(addDays(toStart, 6));
  const [source, household_id] = await Promise.all([
    listPlanningRange(userId, fromWeekStartIso, fromEnd),
    getMyHouseholdId(userId),
  ]);
  if (mode === 'replace') {
    const { error } = await supabase
      .from('planning_entries')
      .delete()
      .eq('household_id', household_id)
      .gte('date', toWeekStartIso)
      .lte('date', toEnd);
    if (error) throw error;
  }
  if (source.length === 0) return;
  const rows = source.map((e) => {
    const offset = Math.round((new Date(e.date).getTime() - fromStart.getTime()) / 86400000);
    return {
      user_id: userId,
      household_id,
      date: toIso(addDays(toStart, offset)),
      slot: e.slot,
      dish_id: e.dish_id,
      is_restaurant: e.is_restaurant,
    };
  });
  const { error } = await supabase.from('planning_entries').insert(rows);
  if (error) throw error;
}
