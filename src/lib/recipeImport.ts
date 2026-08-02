import { DishFormInitial, EMPTY_DISH_FORM_INITIAL, IngredientDraft } from '../components/dishFormTypes';

// En-têtes de section rencontrés sur les sites de cuisine français/anglais.
// Le ":" et le nombre entre parenthèses ("Ingrédients (4 personnes)") sont tolérés.
const INGREDIENTS_HEADER = /^(ingr[ée]dients?|ce qu'il (te|vous) faut|liste des courses)\b.*$/i;
const STEPS_HEADER = /^([ée]tapes?|instructions?|pr[ée]paration|r[ée]alisation|recette|m[ée]thode|marche [àa] suivre)\b.*$/i;
const IGNORED_HEADER = /^(mat[ée]riel|ustensiles?|astuces?|conseils?|notes?|informations?|nutrition|valeurs? nutritionnelles?)\b.*$/i;

// "Préparation : 20 min" ressemble à un en-tête "Préparation" mais n'en est pas
// un : cette expression sert à distinguer une ligne d'info d'un vrai titre.
const TIME_METADATA = /\d+\s*(?:h\b|heures?|min\b|minutes?)/i;

const BULLET = /^[-–—•*▪·o]\s+/;
const NUMBERED = /^(?:[eé]tape\s*)?\d+\s*[.)\]:-]\s*/i;

// "Pour 4 personnes", "4 parts", "Pour 6"
const SERVINGS = /\b(?:pour|sert)\s+(\d{1,2})\s*(?:personnes?|parts?|pers\.?)?\b|\b(\d{1,2})\s*(?:personnes?|parts?)\b/i;
// "Préparation : 20 min", "Temps de cuisson 1 h 30", "Prep time: 25 minutes"
const TIME_LINE = /\b(pr[ée]paration|pr[ée]p|cuisson|repos|total|temps)\b[^0-9]{0,15}(?:(\d+)\s*h(?:eures?)?)?\s*(?:(\d+)\s*(?:min|minutes?))?/i;

const FRACTIONS: Record<string, string> = {
  '½': '0.5', '⅓': '0.33', '⅔': '0.67', '¼': '0.25', '¾': '0.75',
  '⅕': '0.2', '⅖': '0.4', '⅗': '0.6', '⅘': '0.8', '⅙': '0.17', '⅚': '0.83', '⅛': '0.125',
};

// Unités reconnues → forme normalisée utilisée par l'app (voir UNIT_OPTIONS).
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', gramme: 'g', grammes: 'g', grammes_: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramme: 'kg', kilogrammes: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', cl: 'cl', dl: 'dl',
  l: 'L', litre: 'L', litres: 'L',
  cas: 'càs', 'càs': 'càs', cuillere: 'càs', cuillères: 'càs', cuillère: 'càs', cuilleres: 'càs', cs: 'càs', 'c.à.s': 'càs', 'c.a.s': 'càs', tbsp: 'càs',
  cac: 'càc', 'càc': 'càc', cc: 'càc', 'c.à.c': 'càc', 'c.a.c': 'càc', tsp: 'càc',
  pincee: 'pincée', 'pincée': 'pincée', pincees: 'pincée', 'pincées': 'pincée',
  boite: 'boîte', 'boîte': 'boîte', boites: 'boîte', 'boîtes': 'boîte', conserve: 'boîte',
  tranche: 'tranche', tranches: 'tranche',
  gousse: 'gousse', gousses: 'gousse',
  sachet: 'sachet', sachets: 'sachet', paquet: 'sachet', paquets: 'sachet',
  piece: 'pièce', 'pièce': 'pièce', pieces: 'pièce', 'pièces': 'pièce',
};

function normalizeUnit(raw: string | undefined): string {
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/\.$/, '');
  const unit = UNIT_ALIASES[key];
  if (!unit) return '';
  // cl/dl n'existent pas dans les unités de l'app : converties en ml plus bas.
  return unit;
}

function replaceFractions(text: string): string {
  let out = text;
  for (const [glyph, value] of Object.entries(FRACTIONS)) out = out.split(glyph).join(` ${value} `);
  // "1/2", "3/4" → décimal
  out = out.replace(/(\d+)\s*\/\s*(\d+)/g, (_m, a, b) => String(Math.round((Number(a) / Number(b)) * 100) / 100));
  return out;
}

function parseIngredientLine(raw: string): IngredientDraft | null {
  let line = replaceFractions(raw.replace(BULLET, '').replace(NUMBERED, '')).trim();
  // Retire une note entre parenthèses en fin de ligne ("(bio de préférence)")
  line = line.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!line || line.length > 120) return null;

  // Format "Farine : 200 g" (nom d'abord, quantité après les deux-points)
  const colon = line.match(/^([^:]{2,60}):\s*(\d+(?:\.\d+)?)\s*([a-zàâäéèêëïîôöùûüç.]*)\s*$/i);
  if (colon) {
    const [, name, qty, unitRaw] = colon;
    return finish(name, qty, unitRaw);
  }

  // Format courant "200 g de farine", "2 gousses d'ail", "3 œufs", "1 càs d'huile"
  const match = line.match(/^(\d+(?:\.\d+)?)\s*([a-zàâäéèêëïîôöùûüç.]+)?\s*(?:d[eu']\s*|d')?(.*)$/i);
  if (match) {
    const [, qty, maybeUnit, rest] = match;
    const unit = normalizeUnit(maybeUnit);
    // Le mot suivant le nombre n'est pas une unité connue → il fait partie du nom.
    const name = unit ? rest : [maybeUnit, rest].filter(Boolean).join(' ');
    return finish(name, qty, unit ? maybeUnit : undefined);
  }

  // Pas de quantité du tout ("Sel", "Poivre du moulin")
  return { name: capitalize(line), quantity: '', unit: '', grocery_category: 'autre' };
}

function finish(nameRaw: string, qtyRaw: string, unitRaw: string | undefined): IngredientDraft | null {
  let quantity = Number(qtyRaw);
  let unit = normalizeUnit(unitRaw);
  let nameText = nameRaw;
  // L'app ne gère ni cl ni dl : converti en ml pour ne rien perdre.
  if (unitRaw && ['cl', 'dl'].includes(unitRaw.toLowerCase())) {
    quantity = quantity * (unitRaw.toLowerCase() === 'cl' ? 10 : 100);
    unit = 'ml';
  } else if (unitRaw && !unit) {
    // Unité inconnue de l'app ("tasse", "verre") : gardée dans le nom plutôt
    // que perdue, à ajuster à la main.
    nameText = `${nameText.trim()} (${unitRaw})`;
  }
  const name = capitalize(nameText.replace(/^de\s+|^d'/i, '').trim());
  if (!name) return null;
  return {
    name,
    quantity: Number.isFinite(quantity) && quantity > 0 ? String(Math.round(quantity * 100) / 100) : '',
    unit,
    grocery_category: 'autre',
  };
}

function capitalize(text: string): string {
  const t = text.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// Une ligne "ressemble à un ingrédient" si elle est courte et commence par un
// nombre / une puce — sert de repli quand le texte n'a aucun en-tête de section.
function looksLikeIngredient(line: string): boolean {
  if (line.length > 90) return false;
  if (BULLET.test(line)) return true;
  return /^\d/.test(replaceFractions(line).trim()) && !/[.!?]$/.test(line);
}

function looksLikeStep(line: string): boolean {
  return line.length > 45 || NUMBERED.test(line) || /[.!?]$/.test(line);
}

/**
 * Analyse un texte de recette collé (sans IA). Repère les en-têtes de section
 * courants, le nombre de personnes et le temps de préparation, découpe les
 * quantités/unités des ingrédients. Volontairement tolérant : ce qui n'est pas
 * reconnu part quand même dans le formulaire, à corriger à la main.
 */
export function parseRecipeText(text: string): DishFormInitial {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return EMPTY_DISH_FORM_INITIAL;

  let name = '';
  let baseServings = '';
  let prepMinutes = '';
  const ingredients: IngredientDraft[] = [];
  const steps: string[] = [];
  let section: 'none' | 'ingredients' | 'steps' | 'ignored' = 'none';
  let sawHeader = false;
  const unassigned: string[] = [];

  for (const line of lines) {
    // Métadonnées : reconnues où qu'elles soient dans le texte.
    if (!baseServings) {
      const m = line.match(SERVINGS);
      if (m) baseServings = m[1] ?? m[2] ?? '';
    }
    if (!prepMinutes && /pr[ée]p/i.test(line)) {
      const m = line.match(TIME_LINE);
      if (m && (m[2] || m[3])) prepMinutes = String(Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0));
    }

    const isTimeInfo = TIME_METADATA.test(line);
    if (INGREDIENTS_HEADER.test(line) && !isTimeInfo) {
      section = 'ingredients';
      sawHeader = true;
      continue;
    }
    if (STEPS_HEADER.test(line) && !isTimeInfo) {
      section = 'steps';
      sawHeader = true;
      continue;
    }
    // Ligne d'info horaire hors section ("Cuisson : 1 h") : déjà exploitée
    // plus haut si c'était la préparation, on ne la garde pas comme étape.
    if (isTimeInfo && section === 'none') continue;
    if (IGNORED_HEADER.test(line)) {
      section = 'ignored';
      continue;
    }

    if (section === 'none' && !name) {
      name = line.replace(/^recette\s*:?\s*/i, '').trim();
      continue;
    }
    if (section === 'ignored') continue;
    if (section === 'ingredients') {
      const parsed = parseIngredientLine(line);
      if (parsed) ingredients.push(parsed);
    } else if (section === 'steps') {
      const step = line.replace(BULLET, '').replace(NUMBERED, '').trim();
      if (step) steps.push(capitalize(step));
    } else {
      unassigned.push(line);
    }
  }

  // Aucun en-tête reconnu : on devine ligne par ligne (courte + chiffre =
  // ingrédient, longue ou ponctuée = étape).
  if (!sawHeader) {
    for (const line of unassigned) {
      if (looksLikeIngredient(line) && !looksLikeStep(line)) {
        const parsed = parseIngredientLine(line);
        if (parsed) ingredients.push(parsed);
      } else {
        const step = line.replace(BULLET, '').replace(NUMBERED, '').trim();
        if (step) steps.push(capitalize(step));
      }
    }
  }

  return {
    ...EMPTY_DISH_FORM_INITIAL,
    name: name || 'Recette importée',
    baseServings: baseServings || EMPTY_DISH_FORM_INITIAL.baseServings,
    prepMinutes: prepMinutes || '',
    ingredients: ingredients.length > 0 ? ingredients : EMPTY_DISH_FORM_INITIAL.ingredients,
    steps: steps.length > 0 ? steps : EMPTY_DISH_FORM_INITIAL.steps,
  };
}
