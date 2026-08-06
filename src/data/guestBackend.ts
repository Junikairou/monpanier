// Implémentation 100% locale (AsyncStorage) des fonctions data/*.ts, utilisée
// uniquement en mode invité (voir src/lib/guest.ts). Les signatures miment
// volontairement celles des équivalents Supabase pour que dishes.ts,
// planning.ts, groceries.ts, profile.ts, template.ts et taxonomies.ts
// puissent simplement déléguer ici sans changer leur API publique.
import { localUuid, readTable, writeTable } from '../lib/localTable';
import { GUEST_HOUSEHOLD_ID, GUEST_USER_ID } from '../lib/guest';
import { addDays, toIso } from '../lib/dates';
import type {
  Dish,
  GroceryCategory,
  GroceryItem,
  Ingredient,
  MealSlot,
  PlanningEntry,
  RecipeStep,
  TemplateEntry,
} from '../types/models';
import type { NewDishInput } from './dishes';
import type { CopyMode } from './planning';
import type { Profile } from './profile';
import type { TaxonomyItem, TaxonomyKind } from './taxonomies';
import type { CatalogIngredient } from './ingredientsCatalog';

const T = {
  dishes: 'dishes',
  ingredients: 'ingredients',
  steps: 'recipe_steps',
  planning: 'planning_entries',
  template: 'template_entries',
  grocery: 'grocery_items',
};

function mergeKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Plats
// ---------------------------------------------------------------------------

export async function listDishes(): Promise<Dish[]> {
  const dishes = await readTable<Dish>(T.dishes);
  return [...dishes].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDish(id: string): Promise<Dish> {
  const dishes = await readTable<Dish>(T.dishes);
  const dish = dishes.find((d) => d.id === id);
  if (!dish) throw new Error('Plat introuvable.');
  return dish;
}

export async function listIngredients(dishId: string): Promise<Ingredient[]> {
  const rows = await readTable<Ingredient>(T.ingredients);
  return rows.filter((i) => i.dish_id === dishId).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listIngredientNamesByDish(dishIds: string[]): Promise<Record<string, string[]>> {
  const rows = await readTable<Ingredient>(T.ingredients);
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!dishIds.includes(row.dish_id)) continue;
    (map[row.dish_id] ??= []).push(row.name);
  }
  return map;
}

export async function listIngredientRayonByDish(dishIds: string[]): Promise<Record<string, string>> {
  const rows = await readTable<Ingredient>(T.ingredients);
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (!dishIds.includes(row.dish_id)) continue;
    if (!(row.dish_id in map)) map[row.dish_id] = row.grocery_category;
  }
  return map;
}

export async function listRecipeSteps(dishId: string): Promise<RecipeStep[]> {
  const rows = await readTable<RecipeStep>(T.steps);
  return rows.filter((s) => s.dish_id === dishId).sort((a, b) => a.position - b.position);
}

export async function createDish(input: NewDishInput): Promise<Dish> {
  const dishes = await readTable<Dish>(T.dishes);
  const dish: Dish = {
    id: localUuid(),
    user_id: GUEST_USER_ID,
    household_id: GUEST_HOUSEHOLD_ID,
    is_public: false,
    name: input.name,
    category: input.category,
    course_type: input.course_type,
    calories: input.calories,
    protein_g: input.protein_g ?? null,
    carbs_g: input.carbs_g ?? null,
    fat_g: input.fat_g ?? null,
    fiber_g: input.fiber_g ?? null,
    base_servings: input.base_servings ?? 4,
    prep_minutes: input.prep_minutes ?? null,
    image_emoji: input.image_emoji || '🍽️',
    image_url: input.image_url ?? null,
    is_ready_made: input.is_ready_made ?? false,
    created_at: new Date().toISOString(),
  };
  await writeTable(T.dishes, [...dishes, dish]);

  if (input.ingredients.length) {
    const ingredients = await readTable<Ingredient>(T.ingredients);
    const newRows: Ingredient[] = input.ingredients.map((i) => ({ ...i, id: localUuid(), dish_id: dish.id }));
    await writeTable(T.ingredients, [...ingredients, ...newRows]);
  }
  if (input.steps.length) {
    const steps = await readTable<RecipeStep>(T.steps);
    const newRows: RecipeStep[] = input.steps.map((instruction, idx) => ({
      id: localUuid(),
      dish_id: dish.id,
      position: idx + 1,
      instruction,
    }));
    await writeTable(T.steps, [...steps, ...newRows]);
  }
  return dish;
}

export async function updateDish(id: string, input: NewDishInput): Promise<void> {
  const dishes = await readTable<Dish>(T.dishes);
  const idx = dishes.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Plat introuvable.');
  dishes[idx] = {
    ...dishes[idx],
    name: input.name,
    category: input.category,
    course_type: input.course_type,
    calories: input.calories,
    protein_g: input.protein_g ?? null,
    carbs_g: input.carbs_g ?? null,
    fat_g: input.fat_g ?? null,
    fiber_g: input.fiber_g ?? null,
    base_servings: input.base_servings ?? 4,
    prep_minutes: input.prep_minutes ?? null,
    image_emoji: input.image_emoji || '🍽️',
    image_url: input.image_url ?? null,
    is_ready_made: input.is_ready_made ?? false,
  };
  await writeTable(T.dishes, dishes);

  const ingredients = await readTable<Ingredient>(T.ingredients);
  const keptIngredients = ingredients.filter((i) => i.dish_id !== id);
  const newIngredients: Ingredient[] = input.ingredients.map((i) => ({ ...i, id: localUuid(), dish_id: id }));
  await writeTable(T.ingredients, [...keptIngredients, ...newIngredients]);

  const steps = await readTable<RecipeStep>(T.steps);
  const keptSteps = steps.filter((s) => s.dish_id !== id);
  const newSteps: RecipeStep[] = input.steps.map((instruction, idx2) => ({
    id: localUuid(),
    dish_id: id,
    position: idx2 + 1,
    instruction,
  }));
  await writeTable(T.steps, [...keptSteps, ...newSteps]);
}

export async function deleteDish(id: string): Promise<void> {
  const dishes = await readTable<Dish>(T.dishes);
  await writeTable(T.dishes, dishes.filter((d) => d.id !== id));
  const ingredients = await readTable<Ingredient>(T.ingredients);
  await writeTable(T.ingredients, ingredients.filter((i) => i.dish_id !== id));
  const steps = await readTable<RecipeStep>(T.steps);
  await writeTable(T.steps, steps.filter((s) => s.dish_id !== id));
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

async function hydrateDishes(entries: PlanningEntry[]): Promise<PlanningEntry[]> {
  const dishes = await readTable<Dish>(T.dishes);
  const byId = new Map(dishes.map((d) => [d.id, d]));
  return entries.map((e) => ({ ...e, dish: e.dish_id ? byId.get(e.dish_id) : undefined }));
}

export async function listPlanningRange(startIso: string, endIso: string): Promise<PlanningEntry[]> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const filtered = rows.filter((e) => e.date >= startIso && e.date <= endIso).sort((a, b) => a.date.localeCompare(b.date));
  return hydrateDishes(filtered);
}

export async function setMeal(date: string, slot: MealSlot, dish: Dish, servings?: number): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const entry: PlanningEntry = {
    id: localUuid(),
    user_id: GUEST_USER_ID,
    household_id: GUEST_HOUSEHOLD_ID,
    date,
    slot,
    dish_id: dish.id,
    is_restaurant: false,
    is_cooked: false,
    servings: servings ?? dish.base_servings,
    recurrence_group_id: null,
    created_at: new Date().toISOString(),
  };
  await writeTable(T.planning, [...rows, entry]);
}

export async function setMealRecurring(
  dish: Dish,
  slot: MealSlot,
  startIso: string,
  intervalDays: number,
  endIso: string,
  servings?: number,
): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const recurrence_group_id = localUuid();
  const existingKeys = new Set(rows.map((r) => `${r.date}::${r.slot}::${r.dish_id}`));
  const newRows: PlanningEntry[] = [];
  for (let d = new Date(startIso); toIso(d) <= endIso; d = addDays(d, intervalDays)) {
    const date = toIso(d);
    const key = `${date}::${slot}::${dish.id}`;
    if (existingKeys.has(key)) continue;
    newRows.push({
      id: localUuid(),
      user_id: GUEST_USER_ID,
      household_id: GUEST_HOUSEHOLD_ID,
      date,
      slot,
      dish_id: dish.id,
      is_restaurant: false,
      is_cooked: false,
      servings: servings ?? dish.base_servings,
      recurrence_group_id,
      created_at: new Date().toISOString(),
    });
  }
  if (newRows.length === 0) return;
  await writeTable(T.planning, [...rows, ...newRows]);
}

export async function deleteRecurrenceGroupFrom(groupId: string, fromDate: string): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  await writeTable(
    T.planning,
    rows.filter((r) => !(r.recurrence_group_id === groupId && r.date >= fromDate)),
  );
}

export async function deleteRecurrenceGroupAll(groupId: string): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  await writeTable(T.planning, rows.filter((r) => r.recurrence_group_id !== groupId));
}

export async function listRecentPlanningEntries(limit = 50): Promise<PlanningEntry[]> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  return hydrateDishes(sorted);
}

export async function getPlanningEntry(entryId: string): Promise<PlanningEntry> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const entry = rows.find((r) => r.id === entryId);
  if (!entry) throw new Error('Repas introuvable.');
  return (await hydrateDishes([entry]))[0];
}

export async function setEntryServings(entryId: string, servings: number): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const idx = rows.findIndex((r) => r.id === entryId);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], servings: Math.max(1, servings) };
  await writeTable(T.planning, rows);
}

export async function setEntryDate(entryId: string, date: string): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const idx = rows.findIndex((r) => r.id === entryId);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], date };
  await writeTable(T.planning, rows);
}

export async function shiftRecurrenceGroup(groupId: string, entries: PlanningEntry[], newStartIso: string): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return;
  const oldStart = new Date(sorted[0].date);
  const deltaDays = Math.round((new Date(newStartIso).getTime() - oldStart.getTime()) / 86400000);
  if (deltaDays === 0) return;
  const rows = await readTable<PlanningEntry>(T.planning);
  const idsToShift = new Set(entries.map((e) => e.id));
  const next = rows.map((r) =>
    idsToShift.has(r.id) ? { ...r, date: toIso(addDays(new Date(r.date), deltaDays)) } : r,
  );
  await writeTable(T.planning, next);
}

export async function rescheduleRecurrenceGroup(
  groupId: string,
  entries: PlanningEntry[],
  startIso: string,
  endIso: string,
  intervalDays: number,
): Promise<void> {
  const model = [...entries].sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!model) return;
  const rows = (await readTable<PlanningEntry>(T.planning)).filter((r) => r.recurrence_group_id !== groupId);
  const newRows: PlanningEntry[] = [];
  for (let d = new Date(startIso); toIso(d) <= endIso; d = addDays(d, intervalDays)) {
    newRows.push({
      id: localUuid(),
      user_id: model.user_id,
      household_id: model.household_id,
      date: toIso(d),
      slot: model.slot,
      dish_id: model.dish_id,
      is_restaurant: model.is_restaurant,
      is_cooked: false,
      servings: model.servings,
      recurrence_group_id: groupId,
      created_at: new Date().toISOString(),
    });
  }
  if (newRows.length === 0) throw new Error('La date de fin doit être après la date de début.');
  await writeTable(T.planning, [...rows, ...newRows]);
}

export async function replaceMeal(entryId: string, dish: Dish): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const idx = rows.findIndex((r) => r.id === entryId);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], dish_id: dish.id };
  await writeTable(T.planning, rows);
}

export async function removeMeal(entryId: string): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  await writeTable(T.planning, rows.filter((r) => r.id !== entryId));
}

export async function setCooked(entryId: string, cooked: boolean): Promise<void> {
  const rows = await readTable<PlanningEntry>(T.planning);
  const idx = rows.findIndex((r) => r.id === entryId);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], is_cooked: cooked };
  await writeTable(T.planning, rows);
}

export async function hasEntriesInRange(startIso: string, endIso: string): Promise<boolean> {
  const rows = await readTable<PlanningEntry>(T.planning);
  return rows.some((r) => r.date >= startIso && r.date <= endIso);
}

export async function copyDay(fromIso: string, toDate: string, mode: CopyMode): Promise<void> {
  if (fromIso === toDate) return;
  const rows = await readTable<PlanningEntry>(T.planning);
  const source = rows.filter((r) => r.date === fromIso);
  let next = rows;
  if (mode === 'replace') next = next.filter((r) => r.date !== toDate);
  if (source.length === 0) {
    await writeTable(T.planning, next);
    return;
  }
  const added: PlanningEntry[] = source.map((e) => ({
    ...e,
    id: localUuid(),
    date: toDate,
    created_at: new Date().toISOString(),
  }));
  await writeTable(T.planning, [...next, ...added]);
}

export async function copyWeek(fromWeekStartIso: string, toWeekStartIso: string, mode: CopyMode): Promise<void> {
  if (fromWeekStartIso === toWeekStartIso) return;
  const fromStart = new Date(fromWeekStartIso);
  const toStart = new Date(toWeekStartIso);
  const fromEnd = toIso(addDays(fromStart, 6));
  const toEnd = toIso(addDays(toStart, 6));
  const rows = await readTable<PlanningEntry>(T.planning);
  const source = rows.filter((r) => r.date >= fromWeekStartIso && r.date <= fromEnd);
  let next = rows;
  if (mode === 'replace') next = next.filter((r) => !(r.date >= toWeekStartIso && r.date <= toEnd));
  if (source.length === 0) {
    await writeTable(T.planning, next);
    return;
  }
  const added: PlanningEntry[] = source.map((e) => {
    const offset = Math.round((new Date(e.date).getTime() - fromStart.getTime()) / 86400000);
    return { ...e, id: localUuid(), date: toIso(addDays(toStart, offset)), created_at: new Date().toISOString() };
  });
  await writeTable(T.planning, [...next, ...added]);
}

// ---------------------------------------------------------------------------
// Modèle de semaine par défaut
// ---------------------------------------------------------------------------

export async function listTemplate(): Promise<TemplateEntry[]> {
  const rows = await readTable<TemplateEntry>(T.template);
  const dishes = await readTable<Dish>(T.dishes);
  const byId = new Map(dishes.map((d) => [d.id, d]));
  return [...rows]
    .sort((a, b) => a.weekday - b.weekday)
    .map((e) => ({ ...e, dish: e.dish_id ? byId.get(e.dish_id) : undefined }));
}

export async function setTemplateMeal(weekday: number, slot: MealSlot, dish: Dish): Promise<void> {
  const rows = await readTable<TemplateEntry>(T.template);
  const entry: TemplateEntry = {
    id: localUuid(),
    user_id: GUEST_USER_ID,
    weekday,
    slot,
    dish_id: dish.id,
    is_restaurant: false,
    servings: dish.base_servings,
  };
  await writeTable(T.template, [...rows, entry]);
}

export async function replaceTemplateMeal(entryId: string, dish: Dish): Promise<void> {
  const rows = await readTable<TemplateEntry>(T.template);
  const idx = rows.findIndex((r) => r.id === entryId);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], dish_id: dish.id };
  await writeTable(T.template, rows);
}

export async function removeTemplateEntry(entryId: string): Promise<void> {
  const rows = await readTable<TemplateEntry>(T.template);
  await writeTable(T.template, rows.filter((r) => r.id !== entryId));
}

export async function clearTemplate(): Promise<void> {
  await writeTable(T.template, []);
}

export async function saveTemplateFromWeek(weekStartIso: string): Promise<void> {
  const weekEnd = toIso(addDays(new Date(weekStartIso), 6));
  const entries = await listPlanningRange(weekStartIso, weekEnd);
  await clearTemplate();
  if (entries.length === 0) return;
  const start = new Date(weekStartIso);
  const rows: TemplateEntry[] = entries.map((e) => ({
    id: localUuid(),
    user_id: GUEST_USER_ID,
    weekday: Math.round((new Date(e.date).getTime() - start.getTime()) / 86400000),
    slot: e.slot,
    dish_id: e.dish_id,
    is_restaurant: e.is_restaurant,
    servings: e.servings,
  }));
  await writeTable(T.template, rows);
}

export async function applyTemplateToWeek(weekStartIso: string, mode: CopyMode): Promise<void> {
  const template = await listTemplate();
  const weekEnd = toIso(addDays(new Date(weekStartIso), 6));
  const rows = await readTable<PlanningEntry>(T.planning);
  let next = rows;
  if (mode === 'replace') next = next.filter((r) => !(r.date >= weekStartIso && r.date <= weekEnd));
  if (template.length === 0) {
    await writeTable(T.planning, next);
    return;
  }
  const start = new Date(weekStartIso);
  const added: PlanningEntry[] = template.map((e) => ({
    id: localUuid(),
    user_id: GUEST_USER_ID,
    household_id: GUEST_HOUSEHOLD_ID,
    date: toIso(addDays(start, e.weekday)),
    slot: e.slot,
    dish_id: e.dish_id,
    is_restaurant: e.is_restaurant,
    is_cooked: false,
    servings: e.servings,
    recurrence_group_id: null,
    created_at: new Date().toISOString(),
  }));
  await writeTable(T.planning, [...next, ...added]);
}

// ---------------------------------------------------------------------------
// Liste de courses
// ---------------------------------------------------------------------------

export interface GuestGroceryList {
  auto: {
    key: string;
    name: string;
    unit: string;
    quantity: number;
    grocery_category: GroceryCategory;
    source_dish_ids: string[];
    dates: string[];
    checked: boolean;
  }[];
  manual: GroceryItem[];
}

export async function getGroceryListForRange(startIso: string, endIso: string): Promise<GuestGroceryList> {
  const planningRows = await readTable<PlanningEntry>(T.planning);
  const dishOccurrences = planningRows.filter((e) => e.date >= startIso && e.date <= endIso && e.dish_id);
  const uniqueDishIds = Array.from(new Set(dishOccurrences.map((e) => e.dish_id as string)));

  const dishes = await readTable<Dish>(T.dishes);
  const baseServingsById = new Map(dishes.map((d) => [d.id, d.base_servings || 1]));

  const scaleFactor = new Map<string, number>();
  const occurrenceDates = new Map<string, string[]>();
  for (const e of dishOccurrences) {
    const dishId = e.dish_id as string;
    const base = baseServingsById.get(dishId) || 1;
    const factor = (e.servings || base) / base;
    scaleFactor.set(dishId, (scaleFactor.get(dishId) ?? 0) + factor);
    occurrenceDates.set(dishId, [...(occurrenceDates.get(dishId) ?? []), e.date]);
  }

  const allIngredients = await readTable<Ingredient>(T.ingredients);
  const merged = new Map<
    string,
    { name: string; unit: string; quantity: number; grocery_category: GroceryCategory; source_dish_ids: Set<string>; dates: Set<string> }
  >();
  for (const ing of allIngredients) {
    if (!uniqueDishIds.includes(ing.dish_id)) continue;
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

  const groceryRows = await readTable<GroceryItem & { merge_key?: string }>(T.grocery);
  const checkedByKey = new Map<string, boolean>();
  const manual: GroceryItem[] = [];
  for (const row of groceryRows) {
    if (row.manual) manual.push(row);
    else if (row.merge_key) checkedByKey.set(row.merge_key, row.checked);
  }

  const auto = Array.from(merged.entries())
    .map(([key, m]) => ({
      key,
      name: m.name,
      unit: m.unit,
      quantity: Math.round(m.quantity * 100) / 100,
      grocery_category: m.grocery_category,
      source_dish_ids: Array.from(m.source_dish_ids),
      dates: Array.from(m.dates).sort(),
      checked: checkedByKey.get(key) ?? false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { auto, manual };
}

export async function toggleAutoChecked(item: GuestGroceryList['auto'][number], checked: boolean): Promise<void> {
  const rows = await readTable<GroceryItem & { merge_key?: string }>(T.grocery);
  const idx = rows.findIndex((r) => !r.manual && r.merge_key === item.key);
  const row = {
    id: idx === -1 ? localUuid() : rows[idx].id,
    user_id: GUEST_USER_ID,
    name: item.name,
    unit: item.unit,
    grocery_category: item.grocery_category,
    quantity: item.quantity,
    manual: false,
    checked,
    merge_key: item.key,
    source_dish_ids: item.source_dish_ids,
  };
  if (idx === -1) rows.push(row);
  else rows[idx] = row;
  await writeTable(T.grocery, rows);
}

export async function toggleManualChecked(id: string, checked: boolean): Promise<void> {
  const rows = await readTable<GroceryItem>(T.grocery);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return;
  rows[idx] = { ...rows[idx], checked };
  await writeTable(T.grocery, rows);
}

export async function addManualItem(
  name: string,
  quantity: number,
  unit: string,
  grocery_category: GroceryCategory,
): Promise<void> {
  const rows = await readTable<GroceryItem>(T.grocery);
  const row: GroceryItem = {
    id: localUuid(),
    user_id: GUEST_USER_ID,
    name,
    quantity,
    unit,
    grocery_category,
    manual: true,
    checked: false,
    source_dish_ids: [],
  };
  await writeTable(T.grocery, [...rows, row]);
}

// ---------------------------------------------------------------------------
// Profil (préférences locales du mode invité)
// ---------------------------------------------------------------------------

const PROFILE_KEY = 'guest_profile';

const DEFAULT_GUEST_PROFILE: Profile = {
  id: GUEST_USER_ID,
  display_name: 'Invité',
  avatar_url: null,
  phone: null,
  household_id: GUEST_HOUSEHOLD_ID,
  household_size: 1,
  language: 'fr',
  units: 'metric',
  diet: null,
  active_slots: ['petit_dej', 'dejeuner', 'gouter', 'diner', 'collation'],
  onboarded: true,
  show_balance_hint: true,
  show_nutrition_fields: true,
  tag: null,
};

export async function getProfile(): Promise<Profile> {
  const raw = await readTable<Profile>(PROFILE_KEY);
  if (raw.length) return raw[0];
  await writeTable(PROFILE_KEY, [DEFAULT_GUEST_PROFILE]);
  return DEFAULT_GUEST_PROFILE;
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const current = await getProfile();
  await writeTable(PROFILE_KEY, [{ ...current, ...patch }]);
}

// ---------------------------------------------------------------------------
// Taxonomies (lecture seule — valeurs par défaut, pas de personnalisation
// en mode invité)
// ---------------------------------------------------------------------------

const DEFAULT_TAXONOMIES: Record<TaxonomyKind, { key: string; label: string; icon?: string }[]> = {
  category: [
    { key: 'francais', label: 'Français' },
    { key: 'italien', label: 'Italien' },
    { key: 'asiatique', label: 'Asiatique' },
    { key: 'rapide', label: 'Rapide' },
    { key: 'vege', label: 'Végé' },
    { key: 'resto', label: 'Resto' },
    { key: 'autre', label: 'Autre' },
  ],
  course_type: [
    { key: 'entree', label: 'Entrée' },
    { key: 'plat', label: 'Plat' },
    { key: 'accompagnement', label: 'Accompagnement' },
    { key: 'fruit', label: 'Fruit' },
    { key: 'dessert', label: 'Dessert' },
    { key: 'boisson', label: 'Boisson' },
    { key: 'autre', label: 'Autre' },
  ],
  grocery_category: [
    { key: 'fruits_legumes', label: 'Fruits & légumes', icon: '🥦' },
    { key: 'viandes_poissons', label: 'Viandes & poissons', icon: '🍗' },
    { key: 'feculents', label: 'Féculents', icon: '🍞' },
    { key: 'epicerie', label: 'Épicerie', icon: '🛒' },
    { key: 'epicerie_salee', label: 'Épicerie salée', icon: '🥫' },
    { key: 'produits_laitiers', label: 'Produits laitiers', icon: '🧀' },
    { key: 'surgeles', label: 'Surgelés', icon: '🧊' },
    { key: 'boissons', label: 'Boissons', icon: '🥤' },
    { key: 'autre', label: 'Autre', icon: '📦' },
  ],
  meal_slot: [
    { key: 'petit_dej', label: 'Petit déj', icon: '🍳' },
    { key: 'dejeuner', label: 'Déjeuner', icon: '🌞' },
    { key: 'gouter', label: 'Goûter', icon: '🍪' },
    { key: 'diner', label: 'Dîner', icon: '🌙' },
    { key: 'collation', label: 'Collation', icon: '🌰' },
  ],
};

export async function listTaxonomy(kind: TaxonomyKind): Promise<TaxonomyItem[]> {
  return DEFAULT_TAXONOMIES[kind].map((item, position) => ({
    id: `guest:${kind}:${item.key}`,
    household_id: GUEST_HOUSEHOLD_ID,
    key: item.key,
    label: item.label,
    icon: item.icon ?? null,
    position,
  }));
}

// ---------------------------------------------------------------------------
// Catalogue d'ingrédients partagé — pas de catalogue en ligne en mode
// invité, on renvoie simplement une liste vide (pas de suggestions).
// ---------------------------------------------------------------------------

export async function listCatalogIngredients(): Promise<CatalogIngredient[]> {
  return [];
}
