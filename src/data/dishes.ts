import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';
import type { Category, CourseType, Dish, Ingredient, RecipeStep } from '../types/models';

export async function listDishes(userId: string): Promise<Dish[]> {
  // Filtre explicite par foyer : la lecture RLS de "dishes" autorise aussi les
  // plats publics d'autres foyers (catalogue communautaire), donc un simple
  // select('*') remonterait aussi les plats des autres au lieu de rester
  // limité à "Mes plats".
  const household_id = await getMyHouseholdId(userId);
  const { data, error } = await supabase.from('dishes').select('*').eq('household_id', household_id).order('name');
  if (error) throw error;
  return data as Dish[];
}

export async function listPublicDishes(): Promise<Dish[]> {
  const { data, error } = await supabase.from('dishes').select('*').eq('is_public', true).order('name');
  if (error) throw error;
  return data as Dish[];
}

export async function setDishPublic(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from('dishes').update({ is_public: isPublic }).eq('id', id);
  if (error) throw error;
}

export async function updateDishClassification(
  id: string,
  patch: { category?: Category; course_type?: CourseType },
): Promise<void> {
  const { error } = await supabase.from('dishes').update(patch).eq('id', id);
  if (error) throw error;
}

export async function getDish(id: string): Promise<Dish> {
  const { data, error } = await supabase.from('dishes').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Dish;
}

export async function listIngredients(dishId: string): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('dish_id', dishId)
    .order('name');
  if (error) throw error;
  return data as Ingredient[];
}

export async function listIngredientNamesByDish(dishIds: string[]): Promise<Record<string, string[]>> {
  if (dishIds.length === 0) return {};
  const { data, error } = await supabase.from('ingredients').select('dish_id, name').in('dish_id', dishIds);
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of data as { dish_id: string; name: string }[]) {
    (map[row.dish_id] ??= []).push(row.name);
  }
  return map;
}

export async function listRecipeSteps(dishId: string): Promise<RecipeStep[]> {
  const { data, error } = await supabase
    .from('recipe_steps')
    .select('*')
    .eq('dish_id', dishId)
    .order('position');
  if (error) throw error;
  return data as RecipeStep[];
}

export interface NewDishInput {
  name: string;
  category: Category;
  course_type: CourseType;
  calories: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  base_servings?: number;
  prep_minutes?: number | null;
  image_emoji: string;
  is_ready_made?: boolean;
  ingredients: { name: string; quantity: number; unit: string; grocery_category: string }[];
  steps: string[];
}

export async function createDish(userId: string, input: NewDishInput): Promise<Dish> {
  const household_id = await getMyHouseholdId(userId);
  const { data: dish, error } = await supabase
    .from('dishes')
    .insert({
      user_id: userId,
      household_id,
      name: input.name,
      category: input.category,
      course_type: input.course_type,
      calories: input.calories,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fat_g: input.fat_g,
      fiber_g: input.fiber_g,
      base_servings: input.base_servings ?? 4,
      prep_minutes: input.prep_minutes ?? null,
      image_emoji: input.image_emoji || '🍽️',
      is_ready_made: input.is_ready_made ?? false,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.ingredients.length) {
    const { error: ingErr } = await supabase.from('ingredients').insert(
      input.ingredients.map((i) => ({ ...i, dish_id: dish.id })),
    );
    if (ingErr) throw ingErr;
  }

  if (input.steps.length) {
    const { error: stepErr } = await supabase.from('recipe_steps').insert(
      input.steps.map((instruction, idx) => ({
        dish_id: dish.id,
        position: idx + 1,
        instruction,
      })),
    );
    if (stepErr) throw stepErr;
  }

  return dish as Dish;
}

export async function updateDish(id: string, input: NewDishInput): Promise<void> {
  const { error } = await supabase
    .from('dishes')
    .update({
      name: input.name,
      category: input.category,
      course_type: input.course_type,
      calories: input.calories,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fat_g: input.fat_g,
      fiber_g: input.fiber_g,
      base_servings: input.base_servings ?? 4,
      prep_minutes: input.prep_minutes ?? null,
      image_emoji: input.image_emoji || '🍽️',
      is_ready_made: input.is_ready_made ?? false,
    })
    .eq('id', id);
  if (error) throw error;

  const { error: delIngErr } = await supabase.from('ingredients').delete().eq('dish_id', id);
  if (delIngErr) throw delIngErr;
  if (input.ingredients.length) {
    const { error: ingErr } = await supabase.from('ingredients').insert(
      input.ingredients.map((i) => ({ ...i, dish_id: id })),
    );
    if (ingErr) throw ingErr;
  }

  const { error: delStepErr } = await supabase.from('recipe_steps').delete().eq('dish_id', id);
  if (delStepErr) throw delStepErr;
  if (input.steps.length) {
    const { error: stepErr } = await supabase.from('recipe_steps').insert(
      input.steps.map((instruction, idx) => ({ dish_id: id, position: idx + 1, instruction })),
    );
    if (stepErr) throw stepErr;
  }
}

export async function deleteDish(id: string): Promise<void> {
  const { error } = await supabase.from('dishes').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Recopie une recette lisible mais pas à soi (catalogue communautaire, recette
 * reçue d'un ami) dans "Mes plats" — l'original reste intact chez son auteur.
 */
export async function copyDishToMyPlats(userId: string, dish: Dish): Promise<Dish> {
  const [ingredients, steps] = await Promise.all([listIngredients(dish.id), listRecipeSteps(dish.id)]);
  return createDish(userId, {
    name: dish.name,
    category: dish.category,
    course_type: dish.course_type,
    calories: dish.calories,
    protein_g: dish.protein_g,
    carbs_g: dish.carbs_g,
    fat_g: dish.fat_g,
    fiber_g: dish.fiber_g,
    base_servings: dish.base_servings,
    prep_minutes: dish.prep_minutes,
    image_emoji: dish.image_emoji || '🍽️',
    is_ready_made: dish.is_ready_made,
    ingredients: ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, grocery_category: i.grocery_category })),
    steps: steps.sort((a, b) => a.position - b.position).map((s) => s.instruction),
  });
}

export const DEMO_DISHES: NewDishInput[] = [
  {
    name: 'Curry de pois chiches',
    category: 'healthy',
    course_type: 'plat',
    calories: 520,
    image_emoji: '🍛',
    ingredients: [
      { name: 'Pois chiches cuits', quantity: 400, unit: 'g', grocery_category: 'epicerie_salee' },
      { name: 'Lait de coco', quantity: 200, unit: 'ml', grocery_category: 'epicerie' },
      { name: 'Oignon', quantity: 1, unit: '', grocery_category: 'fruits_legumes' },
      { name: 'Tomates concassées', quantity: 1, unit: 'boîte', grocery_category: 'epicerie' },
      { name: 'Pâte de curry', quantity: 2, unit: 'c. à s.', grocery_category: 'epicerie' },
      { name: 'Riz basmati', quantity: 150, unit: 'g', grocery_category: 'epicerie' },
    ],
    steps: [
      "Faire revenir l'oignon émincé 5 min dans un filet d'huile.",
      'Ajouter la pâte de curry, mélanger 1 min pour la réveiller.',
      'Verser tomates et lait de coco, laisser mijoter 10 min.',
      'Incorporer les pois chiches, cuire 8 min à couvert.',
      'Servir sur le riz basmati chaud.',
    ],
  },
  {
    name: 'Bowl lentilles & feta',
    category: 'healthy',
    course_type: 'plat',
    calories: 480,
    image_emoji: '🥗',
    ingredients: [
      { name: 'Riz basmati', quantity: 200, unit: 'g', grocery_category: 'epicerie' },
      { name: 'Feta', quantity: 100, unit: 'g', grocery_category: 'produits_laitiers' },
      { name: 'Lentilles cuites', quantity: 250, unit: 'g', grocery_category: 'epicerie_salee' },
      { name: 'Concombre', quantity: 1, unit: '', grocery_category: 'fruits_legumes' },
    ],
    steps: [
      'Cuire le riz basmati selon le paquet.',
      'Couper le concombre en dés, émietter la feta.',
      'Mélanger riz, lentilles, concombre et feta, assaisonner.',
    ],
  },
  {
    name: 'Pâtes au pesto maison',
    category: 'pates',
    course_type: 'plat',
    calories: 610,
    image_emoji: '🍝',
    ingredients: [
      { name: 'Pâtes', quantity: 300, unit: 'g', grocery_category: 'epicerie' },
      { name: 'Basilic frais', quantity: 1, unit: 'bouquet', grocery_category: 'fruits_legumes' },
      { name: 'Parmesan', quantity: 50, unit: 'g', grocery_category: 'produits_laitiers' },
      { name: 'Pignons de pin', quantity: 30, unit: 'g', grocery_category: 'epicerie' },
    ],
    steps: [
      'Cuire les pâtes al dente.',
      'Mixer basilic, parmesan, pignons et huile d’olive.',
      'Mélanger le pesto aux pâtes égouttées.',
    ],
  },
  {
    name: 'Ratatouille au four',
    category: 'vege',
    course_type: 'accompagnement',
    calories: 180,
    image_emoji: '🥘',
    ingredients: [
      { name: 'Oignon', quantity: 1, unit: '', grocery_category: 'fruits_legumes' },
      { name: 'Courgette', quantity: 2, unit: '', grocery_category: 'fruits_legumes' },
      { name: 'Aubergine', quantity: 1, unit: '', grocery_category: 'fruits_legumes' },
      { name: 'Poivron', quantity: 2, unit: '', grocery_category: 'fruits_legumes' },
      { name: 'Tomates concassées', quantity: 1, unit: 'boîte', grocery_category: 'epicerie' },
    ],
    steps: [
      'Couper tous les légumes en cubes réguliers.',
      "Disposer sur une plaque, arroser d'huile d'olive.",
      'Cuire 40 min à 190°C en mélangeant à mi-cuisson.',
    ],
  },
  {
    name: 'Porridge pomme-cannelle',
    category: 'rapide',
    course_type: 'plat',
    calories: 320,
    image_emoji: '🥣',
    ingredients: [
      { name: 'Flocons d\'avoine', quantity: 60, unit: 'g', grocery_category: 'epicerie' },
      { name: 'Pomme', quantity: 1, unit: '', grocery_category: 'fruits_legumes' },
      { name: 'Lait', quantity: 200, unit: 'ml', grocery_category: 'produits_laitiers' },
      { name: 'Cannelle', quantity: 1, unit: 'pincée', grocery_category: 'epicerie' },
    ],
    steps: [
      'Faire chauffer le lait avec les flocons d\'avoine 5 min.',
      'Ajouter la pomme coupée en dés et la cannelle.',
      'Servir chaud.',
    ],
  },
  {
    name: 'Lasagnes bolognaise',
    category: 'italien',
    course_type: 'plat',
    calories: 650,
    image_emoji: '🍝',
    ingredients: [
      { name: 'Bœuf haché', quantity: 400, unit: 'g', grocery_category: 'viandes_poissons' },
      { name: 'Plaques de lasagnes', quantity: 12, unit: 'pièce', grocery_category: 'feculents' },
      { name: 'Tomates concassées', quantity: 2, unit: 'boîte', grocery_category: 'epicerie_salee' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Fromage râpé', quantity: 150, unit: 'g', grocery_category: 'produits_laitiers' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml', grocery_category: 'produits_laitiers' },
    ],
    steps: [
      "Faire revenir l'oignon émincé puis le bœuf haché, saler et poivrer.",
      'Ajouter les tomates concassées, laisser mijoter 15 min.',
      'Monter les couches : sauce, plaques, crème, en alternant, finir par le fromage.',
      'Cuire 35 min à 200°C.',
    ],
  },
  {
    name: 'Ramen maison',
    category: 'asiatique',
    course_type: 'plat',
    calories: 520,
    image_emoji: '🍜',
    ingredients: [
      { name: 'Nouilles ramen', quantity: 200, unit: 'g', grocery_category: 'feculents' },
      { name: 'Bouillon cube', quantity: 2, unit: 'pièce', grocery_category: 'epicerie_salee' },
      { name: 'Oeufs', quantity: 2, unit: 'pièce', grocery_category: 'viandes_poissons' },
      { name: 'Sauce soja', quantity: 2, unit: 'c. à s.', grocery_category: 'epicerie' },
      { name: 'Champignons', quantity: 150, unit: 'g', grocery_category: 'fruits_legumes' },
      { name: 'Oignon nouveau', quantity: 2, unit: 'pièce', grocery_category: 'fruits_legumes' },
    ],
    steps: [
      'Préparer le bouillon avec les cubes et la sauce soja.',
      'Cuire les œufs mollets (6 min), les écaler.',
      'Faire revenir les champignons émincés.',
      'Cuire les nouilles selon le paquet, répartir dans les bols avec le bouillon.',
      'Garnir avec œuf, champignons et oignon nouveau ciselé.',
    ],
  },
  {
    name: 'Hachis parmentier au bœuf',
    category: 'francais',
    course_type: 'plat',
    calories: 580,
    image_emoji: '🥘',
    ingredients: [
      { name: 'Pomme de terre', quantity: 1000, unit: 'g', grocery_category: 'fruits_legumes' },
      { name: 'Bœuf haché', quantity: 400, unit: 'g', grocery_category: 'viandes_poissons' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Lait', quantity: 100, unit: 'ml', grocery_category: 'produits_laitiers' },
      { name: 'Beurre', quantity: 30, unit: 'g', grocery_category: 'produits_laitiers' },
      { name: 'Fromage râpé', quantity: 80, unit: 'g', grocery_category: 'produits_laitiers' },
    ],
    steps: [
      'Cuire les pommes de terre à l\'eau, les écraser en purée avec lait et beurre.',
      "Faire revenir l'oignon puis le bœuf haché, assaisonner.",
      'Répartir la viande dans un plat, recouvrir de purée puis de fromage.',
      'Gratiner 20 min à 200°C.',
    ],
  },
  {
    name: 'Hachis parmentier végétal (lentilles)',
    category: 'vege',
    course_type: 'plat',
    calories: 480,
    image_emoji: '🥕',
    ingredients: [
      { name: 'Pomme de terre', quantity: 1000, unit: 'g', grocery_category: 'fruits_legumes' },
      { name: 'Lentilles cuites', quantity: 400, unit: 'g', grocery_category: 'epicerie_salee' },
      { name: 'Carotte', quantity: 2, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Lait', quantity: 100, unit: 'ml', grocery_category: 'produits_laitiers' },
    ],
    steps: [
      'Cuire les pommes de terre à l\'eau, les écraser en purée avec le lait.',
      "Faire revenir l'oignon et la carotte en dés, ajouter les lentilles, mijoter 10 min.",
      'Répartir les lentilles dans un plat, recouvrir de purée.',
      'Gratiner 20 min à 200°C.',
    ],
  },
  {
    name: 'Salade de pâtes',
    category: 'rapide',
    course_type: 'plat',
    calories: 420,
    image_emoji: '🥗',
    ingredients: [
      { name: 'Pâtes', quantity: 250, unit: 'g', grocery_category: 'feculents' },
      { name: 'Tomate', quantity: 3, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Concombre', quantity: 1, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Feta', quantity: 100, unit: 'g', grocery_category: 'produits_laitiers' },
      { name: 'Huile d\'olive', quantity: 2, unit: 'c. à s.', grocery_category: 'epicerie' },
    ],
    steps: [
      'Cuire les pâtes al dente, les refroidir sous l\'eau froide.',
      'Couper tomate, concombre et feta en dés.',
      'Mélanger le tout avec l\'huile d\'olive, saler et poivrer.',
    ],
  },
  {
    name: 'Salade de fruits',
    category: 'rapide',
    course_type: 'dessert',
    calories: 150,
    image_emoji: '🍉',
    ingredients: [
      { name: 'Pomme', quantity: 2, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Banane', quantity: 2, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Orange', quantity: 2, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Citron', quantity: 1, unit: 'pièce', grocery_category: 'fruits_legumes' },
    ],
    steps: [
      'Couper tous les fruits en morceaux.',
      'Presser le citron dessus pour éviter l\'oxydation.',
      'Mélanger et réserver au frais avant de servir.',
    ],
  },
  {
    name: 'Poulet rôti et pommes de terre',
    category: 'francais',
    course_type: 'plat',
    calories: 620,
    image_emoji: '🍗',
    ingredients: [
      { name: 'Poulet (blanc)', quantity: 4, unit: 'pièce', grocery_category: 'viandes_poissons' },
      { name: 'Pomme de terre', quantity: 800, unit: 'g', grocery_category: 'fruits_legumes' },
      { name: 'Ail', quantity: 3, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Huile d\'olive', quantity: 2, unit: 'c. à s.', grocery_category: 'epicerie' },
    ],
    steps: [
      'Couper les pommes de terre en quartiers, les disposer avec le poulet dans un plat.',
      'Arroser d\'huile d\'olive, ajouter l\'ail en chemise, saler et poivrer.',
      'Cuire 45 min à 200°C en arrosant à mi-cuisson.',
    ],
  },
  {
    name: 'Omelette aux champignons',
    category: 'rapide',
    course_type: 'plat',
    calories: 380,
    image_emoji: '🍳',
    ingredients: [
      { name: 'Oeufs', quantity: 6, unit: 'pièce', grocery_category: 'viandes_poissons' },
      { name: 'Champignons', quantity: 200, unit: 'g', grocery_category: 'fruits_legumes' },
      { name: 'Fromage râpé', quantity: 60, unit: 'g', grocery_category: 'produits_laitiers' },
      { name: 'Beurre', quantity: 20, unit: 'g', grocery_category: 'produits_laitiers' },
    ],
    steps: [
      'Faire revenir les champignons émincés dans le beurre.',
      'Battre les œufs, assaisonner, verser sur les champignons.',
      'Cuire à feu doux, ajouter le fromage, plier en deux.',
    ],
  },
  {
    name: 'Chili con carne',
    category: 'rapide',
    course_type: 'plat',
    calories: 540,
    image_emoji: '🌶️',
    ingredients: [
      { name: 'Bœuf haché', quantity: 400, unit: 'g', grocery_category: 'viandes_poissons' },
      { name: 'Pois chiches cuits', quantity: 400, unit: 'g', grocery_category: 'epicerie_salee' },
      { name: 'Tomates concassées', quantity: 1, unit: 'boîte', grocery_category: 'epicerie_salee' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', grocery_category: 'fruits_legumes' },
      { name: 'Riz basmati', quantity: 200, unit: 'g', grocery_category: 'feculents' },
    ],
    steps: [
      "Faire revenir l'oignon puis le bœuf haché.",
      'Ajouter tomates et pois chiches, épicer (piment, cumin).',
      'Laisser mijoter 20 min à couvert.',
      'Servir avec le riz basmati.',
    ],
  },
  {
    name: 'Riz cantonais',
    category: 'asiatique',
    course_type: 'plat',
    calories: 460,
    image_emoji: '🍚',
    ingredients: [
      { name: 'Riz basmati', quantity: 300, unit: 'g', grocery_category: 'feculents' },
      { name: 'Oeufs', quantity: 2, unit: 'pièce', grocery_category: 'viandes_poissons' },
      { name: 'Jambon', quantity: 100, unit: 'g', grocery_category: 'viandes_poissons' },
      { name: 'Petits pois surgelés', quantity: 150, unit: 'g', grocery_category: 'surgeles' },
      { name: 'Sauce soja', quantity: 2, unit: 'c. à s.', grocery_category: 'epicerie' },
    ],
    steps: [
      'Cuire le riz, le laisser refroidir (idéalement de la veille).',
      'Faire une omelette fine, la couper en lanières.',
      'Faire revenir le riz avec le jambon en dés et les petits pois.',
      'Ajouter l\'omelette et la sauce soja, mélanger.',
    ],
  },
];

export async function seedDemoDishes(userId: string): Promise<void> {
  for (const dish of DEMO_DISHES) {
    await createDish(userId, dish);
  }
}
