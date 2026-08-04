// Bascule d'un compte invité (100% local) vers un vrai compte Supabase, sans
// perdre les données : réinsère telles quelles les tables locales sous le
// nouvel utilisateur (mêmes id — ce sont déjà des uuid v4 valides — donc les
// références plat<->ingrédients/étapes/planning restent cohérentes sans
// remapping), puis efface le stockage local une fois la copie confirmée.
import { supabase } from '../lib/supabase';
import { readTable, clearAllGuestData } from '../lib/localTable';
import { getMyHouseholdId } from './household';
import type { Dish, GroceryItem, Ingredient, PlanningEntry, RecipeStep, TemplateEntry } from '../types/models';
import type { Profile } from './profile';

const T = {
  dishes: 'dishes',
  ingredients: 'ingredients',
  steps: 'recipe_steps',
  planning: 'planning_entries',
  template: 'template_entries',
  grocery: 'grocery_items',
};

export async function hasGuestDataToMigrate(): Promise<boolean> {
  const dishes = await readTable<Dish>(T.dishes);
  const planning = await readTable<PlanningEntry>(T.planning);
  const grocery = await readTable<GroceryItem>(T.grocery);
  return dishes.length > 0 || planning.length > 0 || grocery.length > 0;
}

/** À appeler juste après l'obtention d'une vraie session Supabase (signup confirmé ou connexion), tant que les données invité existent encore en local. */
export async function migrateGuestDataToAccount(userId: string): Promise<void> {
  const household_id = await getMyHouseholdId(userId);

  const [dishes, ingredients, steps, planning, template, grocery, guestProfiles] = await Promise.all([
    readTable<Dish>(T.dishes),
    readTable<Ingredient>(T.ingredients),
    readTable<RecipeStep>(T.steps),
    readTable<PlanningEntry>(T.planning),
    readTable<TemplateEntry>(T.template),
    readTable<GroceryItem & { merge_key?: string }>(T.grocery),
    readTable<Profile>('guest_profile'),
  ]);

  if (dishes.length) {
    const { error } = await supabase.from('dishes').insert(
      dishes.map((d) => ({
        id: d.id,
        user_id: userId,
        household_id,
        is_public: false,
        name: d.name,
        category: d.category,
        course_type: d.course_type,
        calories: d.calories,
        protein_g: d.protein_g,
        carbs_g: d.carbs_g,
        fat_g: d.fat_g,
        fiber_g: d.fiber_g,
        base_servings: d.base_servings,
        prep_minutes: d.prep_minutes,
        image_emoji: d.image_emoji,
        is_ready_made: d.is_ready_made,
      })),
    );
    if (error) throw error;
  }

  if (ingredients.length) {
    const { error } = await supabase.from('ingredients').insert(
      ingredients.map((i) => ({ id: i.id, dish_id: i.dish_id, name: i.name, quantity: i.quantity, unit: i.unit, grocery_category: i.grocery_category })),
    );
    if (error) throw error;
  }

  if (steps.length) {
    const { error } = await supabase.from('recipe_steps').insert(
      steps.map((s) => ({ id: s.id, dish_id: s.dish_id, position: s.position, instruction: s.instruction })),
    );
    if (error) throw error;
  }

  if (planning.length) {
    const { error } = await supabase.from('planning_entries').insert(
      planning.map((p) => ({
        id: p.id,
        user_id: userId,
        household_id,
        date: p.date,
        slot: p.slot,
        dish_id: p.dish_id,
        is_restaurant: p.is_restaurant,
        is_cooked: p.is_cooked,
        servings: p.servings,
        recurrence_group_id: p.recurrence_group_id,
      })),
    );
    if (error) throw error;
  }

  if (template.length) {
    const { error } = await supabase.from('planning_template_entries').insert(
      template.map((t) => ({
        id: t.id,
        user_id: userId,
        household_id,
        weekday: t.weekday,
        slot: t.slot,
        dish_id: t.dish_id,
        is_restaurant: t.is_restaurant,
        servings: t.servings,
      })),
    );
    if (error) throw error;
  }

  if (grocery.length) {
    const { error } = await supabase.from('grocery_items').insert(
      grocery.map((g) => ({
        id: g.id,
        user_id: userId,
        household_id,
        name: g.name,
        quantity: g.quantity,
        unit: g.unit,
        grocery_category: g.grocery_category,
        manual: g.manual,
        checked: g.checked,
        merge_key: g.merge_key ?? null,
        source_dish_ids: g.source_dish_ids,
      })),
    );
    if (error) throw error;
  }

  const guestProfile = guestProfiles[0];
  if (guestProfile) {
    // Seules les préférences (pas la taille du foyer / onboarding) sont
    // reprises : le nouveau compte passe par l'onboarding normal, qui reste
    // la meilleure façon de régler la taille du foyer pour de vrai.
    const { error } = await supabase
      .from('profiles')
      .update({
        language: guestProfile.language,
        units: guestProfile.units,
        diet: guestProfile.diet,
        active_slots: guestProfile.active_slots,
        show_balance_hint: guestProfile.show_balance_hint,
        show_nutrition_fields: guestProfile.show_nutrition_fields,
      })
      .eq('id', userId);
    if (error) throw error;
  }

  await clearAllGuestData();
}
