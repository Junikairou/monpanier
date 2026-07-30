export type Category = 'rapide' | 'healthy' | 'pates' | 'vege' | 'autre';

export const CATEGORY_LABELS: Record<Category, string> = {
  rapide: 'Rapide',
  healthy: 'Healthy',
  pates: 'Pâtes',
  vege: 'Végé',
  autre: 'Autre',
};

export type CourseType = 'entree' | 'plat' | 'accompagnement' | 'dessert' | 'fruit' | 'boisson' | 'autre';

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  entree: 'Entrée',
  plat: 'Plat',
  accompagnement: 'Accompagnement',
  dessert: 'Dessert',
  fruit: 'Fruit',
  boisson: 'Boisson',
  autre: 'Autre',
};

export const COURSE_TYPE_ORDER: CourseType[] = ['entree', 'plat', 'accompagnement', 'fruit', 'dessert', 'boisson', 'autre'];

export type MealSlot = 'petit_dej' | 'dejeuner' | 'gouter' | 'diner' | 'collation';

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  petit_dej: 'Petit déj',
  dejeuner: 'Déjeuner',
  gouter: 'Goûter',
  diner: 'Dîner',
  collation: 'Collation',
};

export const MEAL_SLOT_ORDER: MealSlot[] = ['petit_dej', 'dejeuner', 'gouter', 'diner', 'collation'];

export type GroceryCategory =
  | 'fruits_legumes'
  | 'viandes_poissons'
  | 'feculents'
  | 'epicerie'
  | 'epicerie_salee'
  | 'produits_laitiers'
  | 'surgeles'
  | 'boissons'
  | 'autre';

export const GROCERY_CATEGORY_LABELS: Record<GroceryCategory, string> = {
  fruits_legumes: 'Fruits & légumes',
  viandes_poissons: 'Viandes & poissons',
  feculents: 'Féculents',
  epicerie: 'Épicerie',
  epicerie_salee: 'Épicerie salée',
  produits_laitiers: 'Produits laitiers',
  surgeles: 'Surgelés',
  boissons: 'Boissons',
  autre: 'Autre',
};

export const GROCERY_CATEGORY_ICONS: Record<GroceryCategory, string> = {
  fruits_legumes: '🥦',
  viandes_poissons: '🍗',
  feculents: '🍞',
  epicerie: '🛒',
  epicerie_salee: '🥫',
  produits_laitiers: '🧀',
  surgeles: '🧊',
  boissons: '🥤',
  autre: '📦',
};

export interface Dish {
  id: string;
  user_id: string;
  name: string;
  category: Category;
  course_type: CourseType;
  calories: number | null;
  image_emoji: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Ingredient {
  id: string;
  dish_id: string;
  name: string;
  quantity: number;
  unit: string;
  grocery_category: GroceryCategory;
}

export interface RecipeStep {
  id: string;
  dish_id: string;
  position: number;
  instruction: string;
}

export interface PlanningEntry {
  id: string;
  user_id: string;
  date: string; // ISO date, e.g. 2026-07-30
  slot: MealSlot;
  dish_id: string | null;
  is_restaurant: boolean;
  is_cooked: boolean;
  dish?: Dish;
}

export interface GroceryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  grocery_category: GroceryCategory;
  checked: boolean;
  manual: boolean;
  source_dish_ids: string[];
}
