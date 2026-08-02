import { supabase } from '../lib/supabase';
import { addDays, toIso } from '../lib/dates';
import { getMyHouseholdId } from './household';
import type { Dish, MealSlot, PlanningEntry } from '../types/models';

export type CopyMode = 'replace' | 'add';

function uuidv4(): string {
  // Pas besoin de sécurité cryptographique ici (juste un identifiant de
  // regroupement client) ; évite une dépendance pour un simple id.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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
  servings?: number,
): Promise<void> {
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('planning_entries').insert({
    user_id: userId,
    household_id,
    date,
    slot,
    dish_id: dish.id,
    servings: servings ?? dish.base_servings,
  });
  if (error) throw error;
}

export async function setMealRecurring(
  userId: string,
  dish: Dish,
  slot: MealSlot,
  startIso: string,
  intervalDays: number,
  endIso: string,
  servings?: number,
): Promise<void> {
  const household_id = await getMyHouseholdId(userId);
  const recurrence_group_id = uuidv4();
  const rows: { user_id: string; household_id: string; date: string; slot: MealSlot; dish_id: string; servings: number; recurrence_group_id: string }[] = [];
  for (let d = new Date(startIso); toIso(d) <= endIso; d = addDays(d, intervalDays)) {
    rows.push({ user_id: userId, household_id, date: toIso(d), slot, dish_id: dish.id, servings: servings ?? dish.base_servings, recurrence_group_id });
  }
  if (rows.length === 0) return;
  // ignoreDuplicates : si ce plat est déjà présent ce jour-là dans ce créneau
  // (contrainte unique user_id+date+slot+dish_id), on l'ignore simplement au lieu
  // de faire échouer tout l'insert groupé (sinon impossible de confirmer une
  // répétition démarrant un jour où le plat est déjà planifié).
  const { error } = await supabase.from('planning_entries').upsert(rows, {
    onConflict: 'user_id,date,slot,dish_id',
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

// Supprime cette occurrence et toutes celles de la même série de répétition
// à partir de cette date (garde les occurrences passées intactes).
export async function deleteRecurrenceGroupFrom(groupId: string, fromDate: string): Promise<void> {
  const { error } = await supabase
    .from('planning_entries')
    .delete()
    .eq('recurrence_group_id', groupId)
    .gte('date', fromDate);
  if (error) throw error;
}

// Supprime toute la série (passé et futur inclus).
export async function deleteRecurrenceGroupAll(groupId: string): Promise<void> {
  const { error } = await supabase.from('planning_entries').delete().eq('recurrence_group_id', groupId);
  if (error) throw error;
}

export async function listRecentPlanningEntries(limit = 50): Promise<PlanningEntry[]> {
  const { data, error } = await supabase
    .from('planning_entries')
    .select('*, dish:dishes(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as PlanningEntry[];
}

export async function getPlanningEntry(entryId: string): Promise<PlanningEntry> {
  const { data, error } = await supabase.from('planning_entries').select('*, dish:dishes(*)').eq('id', entryId).single();
  if (error) throw error;
  return data as unknown as PlanningEntry;
}

export async function setEntryServings(entryId: string, servings: number): Promise<void> {
  const { error } = await supabase.from('planning_entries').update({ servings: Math.max(1, servings) }).eq('id', entryId);
  if (error) throw error;
}

// Corrige la date d'une entrée isolée (erreur de saisie).
export async function setEntryDate(entryId: string, date: string): Promise<void> {
  const { error } = await supabase.from('planning_entries').update({ date }).eq('id', entryId);
  if (error) throw error;
}

// Décale toute une série (erreur sur la date de départ) : recalcule chaque
// date à partir du même écart en jours, en gardant l'intervalle d'origine.
export async function shiftRecurrenceGroup(groupId: string, entries: PlanningEntry[], newStartIso: string): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const oldStart = new Date(sorted[0].date);
  const deltaDays = Math.round((new Date(newStartIso).getTime() - oldStart.getTime()) / 86400000);
  if (deltaDays === 0) return;
  for (const entry of sorted) {
    const newDate = toIso(addDays(new Date(entry.date), deltaDays));
    const { error } = await supabase.from('planning_entries').update({ date: newDate }).eq('id', entry.id);
    if (error) throw error;
  }
}

/**
 * Refait complètement une série de répétition : nouvelle date de début, de fin
 * et/ou nouvelle fréquence. On supprime les occurrences existantes puis on
 * régénère, en gardant le même identifiant de série, le même plat, le même
 * créneau et les mêmes portions — c'est le seul moyen fiable de changer un
 * intervalle (le nombre d'occurrences change).
 */
export async function rescheduleRecurrenceGroup(
  groupId: string,
  entries: PlanningEntry[],
  startIso: string,
  endIso: string,
  intervalDays: number,
): Promise<void> {
  const model = [...entries].sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!model) return;

  const rows: Record<string, unknown>[] = [];
  for (let d = new Date(startIso); toIso(d) <= endIso; d = addDays(d, intervalDays)) {
    rows.push({
      user_id: model.user_id,
      household_id: model.household_id,
      date: toIso(d),
      slot: model.slot,
      dish_id: model.dish_id,
      servings: model.servings,
      recurrence_group_id: groupId,
    });
  }
  if (rows.length === 0) throw new Error('La date de fin doit être après la date de début.');

  const { error: delErr } = await supabase.from('planning_entries').delete().eq('recurrence_group_id', groupId);
  if (delErr) throw delErr;

  const { error } = await supabase.from('planning_entries').upsert(rows, {
    onConflict: 'user_id,date,slot,dish_id',
    ignoreDuplicates: true,
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
    servings: e.servings,
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
      servings: e.servings,
    };
  });
  const { error } = await supabase.from('planning_entries').insert(rows);
  if (error) throw error;
}
