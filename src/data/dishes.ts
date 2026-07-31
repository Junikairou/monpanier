import { supabase } from '../lib/supabase';
import type { Category, CourseType, Dish, Ingredient, RecipeStep } from '../types/models';

export async function listDishes(): Promise<Dish[]> {
  const { data, error } = await supabase.from('dishes').select('*').order('name');
  if (error) throw error;
  return data as Dish[];
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
  image_emoji: string;
  ingredients: { name: string; quantity: number; unit: string; grocery_category: string }[];
  steps: string[];
}

export async function createDish(userId: string, input: NewDishInput): Promise<Dish> {
  const { data: dish, error } = await supabase
    .from('dishes')
    .insert({
      user_id: userId,
      name: input.name,
      category: input.category,
      course_type: input.course_type,
      calories: input.calories,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fat_g: input.fat_g,
      fiber_g: input.fiber_g,
      base_servings: input.base_servings ?? 4,
      image_emoji: input.image_emoji || '🍽️',
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
      image_emoji: input.image_emoji || '🍽️',
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
];

export async function seedDemoDishes(userId: string): Promise<void> {
  for (const dish of DEMO_DISHES) {
    await createDish(userId, dish);
  }
}
