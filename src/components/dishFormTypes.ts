import type { Category, CourseType, GroceryCategory } from '../types/models';

// Types et valeurs par défaut du formulaire de plat, isolés du composant React
// pour être réutilisables (et testables) sans dépendre de react-native.
export type IngredientDraft = { name: string; quantity: string; unit: string; grocery_category: GroceryCategory };

export interface DishFormInitial {
  name: string;
  emoji: string;
  category: Category;
  courseType: CourseType;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  baseServings: string;
  prepMinutes: string;
  ingredients: IngredientDraft[];
  steps: string[];
  isReadyMade: boolean;
}

export const EMPTY_DISH_FORM_INITIAL: DishFormInitial = {
  name: '',
  emoji: '🍽️',
  category: 'rapide',
  courseType: 'plat',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  baseServings: '4',
  prepMinutes: '',
  ingredients: [{ name: '', quantity: '', unit: '', grocery_category: 'autre' }],
  steps: [''],
  isReadyMade: false,
};
