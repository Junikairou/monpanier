import { supabase } from '../lib/supabase';
import { addDays, toIso } from '../lib/dates';
import { listPlanningRange } from './planning';
import type { CopyMode } from './planning';
import { getMyHouseholdId } from './household';
import { isGuestModeSync, isGuestUserId } from '../lib/guest';
import * as guest from './guestBackend';
import type { Dish, MealSlot, TemplateEntry } from '../types/models';

export async function listTemplate(userId: string): Promise<TemplateEntry[]> {
  if (isGuestUserId(userId)) return guest.listTemplate();
  const { data, error } = await supabase
    .from('planning_template_entries')
    .select('*, dish:dishes(*)')
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
  if (isGuestUserId(userId)) return guest.setTemplateMeal(weekday, slot, dish);
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('planning_template_entries').insert({
    user_id: userId,
    household_id,
    weekday,
    slot,
    dish_id: dish.id,
    servings: dish.base_servings,
  });
  if (error) throw error;
}


export async function replaceTemplateMeal(entryId: string, dish: Dish): Promise<void> {
  if (isGuestModeSync()) return guest.replaceTemplateMeal(entryId, dish);
  const { error } = await supabase.from('planning_template_entries').update({ dish_id: dish.id }).eq('id', entryId);
  if (error) throw error;
}

export async function removeTemplateEntry(entryId: string): Promise<void> {
  if (isGuestModeSync()) return guest.removeTemplateEntry(entryId);
  const { error } = await supabase.from('planning_template_entries').delete().eq('id', entryId);
  if (error) throw error;
}

export async function clearTemplate(userId: string): Promise<void> {
  if (isGuestUserId(userId)) return guest.clearTemplate();
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('planning_template_entries').delete().eq('household_id', household_id);
  if (error) throw error;
}

export async function saveTemplateFromWeek(userId: string, weekStartIso: string): Promise<void> {
  if (isGuestUserId(userId)) return guest.saveTemplateFromWeek(weekStartIso);
  const weekEnd = toIso(addDays(new Date(weekStartIso), 6));
  const [entries, household_id] = await Promise.all([
    listPlanningRange(userId, weekStartIso, weekEnd),
    getMyHouseholdId(userId),
  ]);
  await clearTemplate(userId);
  if (entries.length === 0) return;
  const start = new Date(weekStartIso);
  const rows = entries.map((e) => ({
    user_id: userId,
    household_id,
    weekday: Math.round((new Date(e.date).getTime() - start.getTime()) / 86400000),
    slot: e.slot,
    dish_id: e.dish_id,
    is_restaurant: e.is_restaurant,
    servings: e.servings,
  }));
  const { error } = await supabase.from('planning_template_entries').insert(rows);
  if (error) throw error;
}

export async function applyTemplateToWeek(userId: string, weekStartIso: string, mode: CopyMode): Promise<void> {
  if (isGuestUserId(userId)) return guest.applyTemplateToWeek(weekStartIso, mode);
  const [template, household_id] = await Promise.all([listTemplate(userId), getMyHouseholdId(userId)]);
  const weekEnd = toIso(addDays(new Date(weekStartIso), 6));
  if (mode === 'replace') {
    const { error } = await supabase
      .from('planning_entries')
      .delete()
      .eq('household_id', household_id)
      .gte('date', weekStartIso)
      .lte('date', weekEnd);
    if (error) throw error;
  }
  if (template.length === 0) return;
  const start = new Date(weekStartIso);
  const rows = template.map((e) => ({
    user_id: userId,
    household_id,
    date: toIso(addDays(start, e.weekday)),
    slot: e.slot,
    dish_id: e.dish_id,
    is_restaurant: e.is_restaurant,
    servings: e.servings,
  }));
  const { error } = await supabase.from('planning_entries').insert(rows);
  if (error) throw error;
}
