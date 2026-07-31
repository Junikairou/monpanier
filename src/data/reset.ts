import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';
import { updateProfile } from './profile';
import { listTaxonomy } from './taxonomies';

export interface ResetOptions {
  plats: boolean;
  planning: boolean;
  courses: boolean;
  modele: boolean;
  preferences: boolean;
}

export async function resetData(userId: string, options: ResetOptions): Promise<void> {
  const household_id = await getMyHouseholdId(userId);

  if (options.planning) {
    const { error } = await supabase.from('planning_entries').delete().eq('household_id', household_id);
    if (error) throw error;
  }
  if (options.courses) {
    const { error } = await supabase.from('grocery_items').delete().eq('household_id', household_id);
    if (error) throw error;
  }
  if (options.modele) {
    const { error } = await supabase.from('planning_template_entries').delete().eq('household_id', household_id);
    if (error) throw error;
  }
  if (options.plats) {
    const { error } = await supabase.from('dishes').delete().eq('user_id', userId);
    if (error) throw error;
  }
  if (options.preferences) {
    const mealSlots = await listTaxonomy('meal_slot');
    await updateProfile(userId, {
      household_size: 1,
      active_slots: mealSlots.map((m) => m.key),
      show_balance_hint: true,
      units: 'metric',
      language: 'fr',
      diet: null,
    });
  }
}
