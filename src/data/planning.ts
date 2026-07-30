import { supabase } from '../lib/supabase';
import type { Dish, MealSlot, PlanningEntry } from '../types/models';

export async function listPlanningRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<PlanningEntry[]> {
  const { data, error } = await supabase
    .from('planning_entries')
    .select('*, dish:dishes(*)')
    .eq('user_id', userId)
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
  const { error } = await supabase.from('planning_entries').insert({
    user_id: userId,
    date,
    slot,
    dish_id: dish.id,
  });
  if (error) throw error;
}

export async function setRestaurantMeal(userId: string, date: string, slot: MealSlot): Promise<void> {
  const { error } = await supabase.from('planning_entries').insert({
    user_id: userId,
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
