import { supabase } from '../lib/supabase';
import { addDays, toIso } from '../lib/dates';
import { listPlanningRange } from './planning';
import type { CopyMode } from './planning';
import type { Dish, MealSlot, TemplateEntry } from '../types/models';

export async function listTemplate(userId: string): Promise<TemplateEntry[]> {
  const { data, error } = await supabase
    .from('planning_template_entries')
    .select('*, dish:dishes(*)')
    .eq('user_id', userId)
    .order('weekday');
  if (error) throw error;
  return data as unknown as TemplateEntry[];
}

export async function setTemplateMeal(
  userId: string,
  weekday: number,
  slot: MealSlot,
  dish: Dish,
): Promise<void> {
  const { error } = await supabase.from('planning_template_entries').insert({
    user_id: userId,
    weekday,
    slot,
    dish_id: dish.id,
  });
  if (error) throw error;
}

export async function setTemplateRestaurant(userId: string, weekday: number, slot: MealSlot): Promise<void> {
  const { error } = await supabase.from('planning_template_entries').insert({
    user_id: userId,
    weekday,
    slot,
    dish_id: null,
    is_restaurant: true,
  });
  if (error) throw error;
}

export async function replaceTemplateMeal(entryId: string, dish: Dish): Promise<void> {
  const { error } = await supabase.from('planning_template_entries').update({ dish_id: dish.id }).eq('id', entryId);
  if (error) throw error;
}

export async function removeTemplateEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('planning_template_entries').delete().eq('id', entryId);
  if (error) throw error;
}

export async function clearTemplate(userId: string): Promise<void> {
  const { error } = await supabase.from('planning_template_entries').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function saveTemplateFromWeek(userId: string, weekStartIso: string): Promise<void> {
  const weekEnd = toIso(addDays(new Date(weekStartIso), 6));
  const entries = await listPlanningRange(userId, weekStartIso, weekEnd);
  await clearTemplate(userId);
  if (entries.length === 0) return;
  const start = new Date(weekStartIso);
  const rows = entries.map((e) => ({
    user_id: userId,
    weekday: Math.round((new Date(e.date).getTime() - start.getTime()) / 86400000),
    slot: e.slot,
    dish_id: e.dish_id,
    is_restaurant: e.is_restaurant,
  }));
  const { error } = await supabase.from('planning_template_entries').insert(rows);
  if (error) throw error;
}

export async function applyTemplateToWeek(userId: string, weekStartIso: string, mode: CopyMode): Promise<void> {
  const template = await listTemplate(userId);
  const weekEnd = toIso(addDays(new Date(weekStartIso), 6));
  if (mode === 'replace') {
    const { error } = await supabase
      .from('planning_entries')
      .delete()
      .eq('user_id', userId)
      .gte('date', weekStartIso)
      .lte('date', weekEnd);
    if (error) throw error;
  }
  if (template.length === 0) return;
  const start = new Date(weekStartIso);
  const rows = template.map((e) => ({
    user_id: userId,
    date: toIso(addDays(start, e.weekday)),
    slot: e.slot,
    dish_id: e.dish_id,
    is_restaurant: e.is_restaurant,
  }));
  const { error } = await supabase.from('planning_entries').insert(rows);
  if (error) throw error;
}
