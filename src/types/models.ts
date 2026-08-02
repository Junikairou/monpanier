// Les valeurs possibles sont personnalisables par foyer (voir Plus >
// Personnalisation) : Category/CourseType/GroceryCategory/MealSlot sont donc
// des identifiants libres (`string`), pas des unions figées. Les listes et
// libellés affichés viennent de useTaxonomies() (src/lib/taxonomies.tsx),
// pas de constantes figées.
export type Category = string;

export type CourseType = string;

export type MealSlot = string;

export type GroceryCategory = string;

export interface Dish {
  id: string;
  user_id: string;
  household_id: string;
  is_public: boolean;
  name: string;
  category: Category;
  course_type: CourseType;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  base_servings: number;
  prep_minutes: number | null;
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
  household_id: string;
  date: string; // ISO date, e.g. 2026-07-30
  slot: MealSlot;
  dish_id: string | null;
  is_restaurant: boolean;
  is_cooked: boolean;
  servings: number;
  recurrence_group_id: string | null;
  created_at: string;
  dish?: Dish;
}

export interface TemplateEntry {
  id: string;
  user_id: string;
  weekday: number; // 0 = lundi ... 6 = dimanche
  slot: MealSlot;
  dish_id: string | null;
  is_restaurant: boolean;
  servings: number;
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
