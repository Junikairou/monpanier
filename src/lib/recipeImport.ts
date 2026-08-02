import { DishFormInitial, EMPTY_DISH_FORM_INITIAL, IngredientDraft } from '../components/DishForm';

const INGREDIENTS_HEADER = /^ingr[ée]dients?\s*:?\s*$/i;
const STEPS_HEADER = /^(étapes?|instructions?|pr[ée]paration|réalisation)\s*:?\s*$/i;
const BULLET = /^[-•*▪]\s*/;
const NUMBERED = /^\d+[.)]\s*/;

const KNOWN_UNITS = ['g', 'kg', 'ml', 'l', 'càs', 'càc', 'pincée', 'boîte', 'boite', 'tranche', 'gousse', 'sachet', 'pièce', 'piece'];

function parseIngredientLine(raw: string): IngredientDraft {
  const line = raw.replace(BULLET, '').trim();
  // ex. "200 g de farine", "2 œufs", "1 càs d'huile d'olive"
  const match = line.match(/^([\d]+(?:[.,/][\d]+)?)\s*([a-zàâäéèêëïîôöùûüç]+)?\s*(?:de |d')?(.+)$/i);
  if (match) {
    const [, qty, maybeUnit, rest] = match;
    const unit = maybeUnit && KNOWN_UNITS.includes(maybeUnit.toLowerCase()) ? maybeUnit.toLowerCase() : '';
    const name = unit ? rest.trim() : [maybeUnit, rest].filter(Boolean).join(' ').trim();
    return { name: name || line, quantity: qty.replace(',', '.'), unit, grocery_category: 'autre' };
  }
  return { name: line, quantity: '', unit: '', grocery_category: 'autre' };
}

// Analyse basique d'un texte de recette collé (pas d'IA) : repère les en-têtes
// "Ingrédients" / "Étapes" courants et découpe les lignes en dessous. Reste
// volontairement simple — l'utilisateur corrige ensuite dans le formulaire.
export function parseRecipeText(text: string): DishFormInitial {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return EMPTY_DISH_FORM_INITIAL;

  let name = '';
  const ingredients: IngredientDraft[] = [];
  const steps: string[] = [];
  let section: 'none' | 'ingredients' | 'steps' = 'none';
  let sawHeader = false;

  for (const line of lines) {
    if (INGREDIENTS_HEADER.test(line)) {
      section = 'ingredients';
      sawHeader = true;
      continue;
    }
    if (STEPS_HEADER.test(line)) {
      section = 'steps';
      sawHeader = true;
      continue;
    }
    if (section === 'none' && !name) {
      name = line;
      continue;
    }
    if (section === 'ingredients') {
      ingredients.push(parseIngredientLine(line));
    } else if (section === 'steps') {
      steps.push(line.replace(BULLET, '').replace(NUMBERED, ''));
    }
  }

  // Repli si aucun en-tête reconnu : tout part en étapes, à trier à la main.
  if (!sawHeader) {
    steps.length = 0;
    for (const line of lines.slice(name ? 1 : 0)) {
      steps.push(line.replace(BULLET, '').replace(NUMBERED, ''));
    }
  }

  return {
    ...EMPTY_DISH_FORM_INITIAL,
    name: name || 'Recette importée',
    ingredients: ingredients.length > 0 ? ingredients : EMPTY_DISH_FORM_INITIAL.ingredients,
    steps: steps.length > 0 ? steps : EMPTY_DISH_FORM_INITIAL.steps,
  };
}
