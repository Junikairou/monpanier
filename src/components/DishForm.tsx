import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { useTaxonomies } from '../lib/taxonomies';
import { useAuth } from '../lib/auth';
import { getProfile } from '../data/profile';
import { Chip, Field, Pill } from './ui';
import { ActionSheet } from './ActionSheet';
import { EmojiPicker } from './EmojiPicker';
import { IngredientPicker } from './IngredientPicker';
import { ArticleEditModal } from './ArticleEditModal';
import { NewDishInput } from '../data/dishes';
import { pickAndUploadDishPhoto } from '../data/dishPhoto';
import { TaxonomyItem } from '../data/taxonomies';
import {
  CatalogIngredient,
  createCatalogIngredient,
  deleteCatalogIngredient,
  ensureCatalogIngredient,
  listCatalogIngredients,
  updateCatalogIngredient,
} from '../data/ingredientsCatalog';
import { listDishes } from '../data/dishes';
import { Category, CourseType, GroceryCategory } from '../types/models';
import { fonts } from '../theme/tokens';
import { noSelectWebStyle, useWebHorizontalDrag } from '../lib/webDragScroll';

const RAYON_KEYWORDS: { category: string; words: string[] }[] = [
  {
    category: 'fruits_legumes',
    words: [
      'pomme', 'banane', 'carotte', 'tomate', 'salade', 'oignon', 'ail', 'poivron', 'courgette',
      'citron', 'fraise', 'poire', 'orange', 'concombre', 'brocoli', 'épinard', 'epinard',
      'champignon', 'avocat', 'pomme de terre', 'patate', 'persil', 'basilic', 'menthe', 'coriandre',
      'aubergine', 'radis', 'chou', 'poireau', 'céleri', 'celeri', 'framboise', 'mangue', 'raisin',
    ],
  },
  {
    category: 'viandes_poissons',
    words: [
      'poulet', 'boeuf', 'bœuf', 'porc', 'dinde', 'veau', 'agneau', 'saumon', 'thon', 'cabillaud',
      'crevette', 'jambon', 'lardons', 'steak', 'poisson', 'viande', 'merguez', 'saucisse', 'bacon',
    ],
  },
  {
    category: 'feculents',
    words: ['riz', 'pâtes', 'pates', 'pain', 'quinoa', 'semoule', 'boulgour', 'farine', 'spaghetti', 'nouilles'],
  },
  {
    category: 'produits_laitiers',
    words: [
      'lait', 'beurre', 'crème', 'creme', 'fromage', 'yaourt', 'yogourt', 'oeuf', 'œuf', 'parmesan',
      'mozzarella', 'feta', 'chèvre', 'chevre', 'gruyère', 'gruyere',
    ],
  },
  {
    category: 'epicerie',
    words: ['huile', 'sucre', 'sel', 'poivre', 'miel', 'vinaigre', 'moutarde', 'épice', 'epice', 'levure', 'vanille', 'farine'],
  },
  {
    category: 'epicerie_salee',
    words: ['conserve', 'olive', 'cornichon', 'ketchup', 'mayonnaise', 'bouillon', 'sauce tomate'],
  },
  {
    category: 'surgeles',
    words: ['surgelé', 'surgele', 'glace'],
  },
  {
    category: 'boissons',
    words: ['eau', 'jus', 'soda', 'vin', 'bière', 'biere', 'café', 'cafe', 'thé', 'the'],
  },
];

function guessGroceryCategory(name: string, available: TaxonomyItem[]): string | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  for (const { category, words } of RAYON_KEYWORDS) {
    if (words.some((w) => n.includes(w)) && available.some((g) => g.key === category)) {
      return category;
    }
  }
  return null;
}

const STEP_SUGGESTIONS = [
  'Préchauffer le four à 180°C',
  'Éplucher et couper les légumes',
  "Faire chauffer l'huile dans une poêle",
  'Faire revenir à feu moyen pendant 5 minutes',
  'Ajouter et mélanger',
  'Assaisonner avec sel et poivre',
  'Laisser cuire 20 minutes',
  'Laisser reposer avant de servir',
];

// Définis dans dishFormTypes.ts (module sans dépendance react-native, pour
// que l'import de recette puisse les réutiliser) ; ré-exportés ici, les écrans
// les important déjà depuis ce fichier.
import { DishFormInitial, EMPTY_DISH_FORM_INITIAL, IngredientDraft } from './dishFormTypes';
export type { DishFormInitial, IngredientDraft };
export { EMPTY_DISH_FORM_INITIAL };

interface DishFormProps {
  initial?: DishFormInitial;
  submitLabel: string;
  onSubmit: (input: NewDishInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

const UNIT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Pièce', value: 'pièce' },
  { label: 'Gramme', value: 'g' },
  { label: 'Kilogramme', value: 'kg' },
  { label: 'Millilitre', value: 'ml' },
  { label: 'Litre', value: 'L' },
  { label: 'Cuillère à soupe', value: 'càs' },
  { label: 'Cuillère à café', value: 'càc' },
  { label: 'Pincée', value: 'pincée' },
  { label: 'Boîte', value: 'boîte' },
  { label: 'Tranche', value: 'tranche' },
  { label: 'Gousse', value: 'gousse' },
  { label: 'Sachet', value: 'sachet' },
];
const STEP_ROW_HEIGHT = 42;
const ING_ROW_HEIGHT = 58;
// Empêche la sélection de texte au clic-glissé (poignée ☰) sur navigateur.
const dragHandleWebStyle = Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab' } as any) : null;

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === -1) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function DishForm({ initial = EMPTY_DISH_FORM_INITIAL, submitLabel, onSubmit, onDirtyChange }: DishFormProps) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { categories, courseTypes, groceryCategories } = useTaxonomies();

  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [imageUrl, setImageUrl] = useState<string | null>(initial.imageUrl);
  const [visualMenuOpen, setVisualMenuOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [category, setCategory] = useState<Category>(initial.category);
  const [courseType, setCourseType] = useState<CourseType>(initial.courseType);
  const [courseTypeMenuOpen, setCourseTypeMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [calories, setCalories] = useState(initial.calories);
  const [protein, setProtein] = useState(initial.protein);
  const [carbs, setCarbs] = useState(initial.carbs);
  const [fat, setFat] = useState(initial.fat);
  const [fiber, setFiber] = useState(initial.fiber);
  const [baseServings, setBaseServings] = useState(initial.baseServings);
  const [prepMinutes, setPrepMinutes] = useState(initial.prepMinutes);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(initial.ingredients);
  const [unitMenuFor, setUnitMenuFor] = useState<number | null>(null);
  const [editArticleFor, setEditArticleFor] = useState<number | null>(null);
  const [steps, setSteps] = useState<string[]>(initial.steps);
  const [isReadyMade, setIsReadyMade] = useState(initial.isReadyMade);
  const [readyRayonMenuOpen, setReadyRayonMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showNutrition, setShowNutrition] = useState(true);
  const [catalogItems, setCatalogItems] = useState<CatalogIngredient[]>([]);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [stepDragIdx, setStepDragIdx] = useState<number | null>(null);
  const [stepDragDy, setStepDragDy] = useState(0);
  const [stepBaseOrder, setStepBaseOrder] = useState<string[]>([]);
  const [ingDragIdx, setIngDragIdx] = useState<number | null>(null);
  const [ingDragDy, setIngDragDy] = useState(0);
  const [ingBaseOrder, setIngBaseOrder] = useState<IngredientDraft[]>([]);
  const categoryDrag = useWebHorizontalDrag();
  const stepSuggestionDrag = useWebHorizontalDrag();

  useEffect(() => {
    getProfile(session!.user.id).then((p) => setShowNutrition(p.show_nutrition_fields));
  }, [session]);

  useEffect(() => {
    listCatalogIngredients().then(setCatalogItems).catch(() => {});
    listDishes(session!.user.id).then((d) => setExistingNames(d.map((x) => x.name))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDuplicateName =
    !!name.trim() &&
    existingNames.some(
      (n) => n.trim().toLowerCase() === name.trim().toLowerCase() && n.trim().toLowerCase() !== initial.name.trim().toLowerCase(),
    );

  const stepTargetIndex =
    stepDragIdx !== null
      ? Math.min(stepBaseOrder.length - 1, Math.max(0, stepDragIdx + Math.round(stepDragDy / STEP_ROW_HEIGHT)))
      : -1;
  const stepDisplayOrder = stepDragIdx !== null ? moveItem(stepBaseOrder, stepDragIdx, stepTargetIndex) : steps;
  const stepRowOffset = stepDragIdx !== null ? stepDragDy - (stepTargetIndex - stepDragIdx) * STEP_ROW_HEIGHT : 0;

  const startStepDrag = (idx: number) => {
    setStepBaseOrder(steps);
    setStepDragIdx(idx);
    setStepDragDy(0);
  };
  const onStepDragMove = (dy: number) => {
    if (stepDragIdx === null) return;
    const overshoot = STEP_ROW_HEIGHT * 0.6;
    const min = -stepDragIdx * STEP_ROW_HEIGHT - overshoot;
    const max = (stepBaseOrder.length - 1 - stepDragIdx) * STEP_ROW_HEIGHT + overshoot;
    setStepDragDy(Math.min(max, Math.max(min, dy)));
  };
  const endStepDrag = () => {
    if (stepDragIdx !== null && stepTargetIndex !== stepDragIdx) {
      setSteps(moveItem(stepBaseOrder, stepDragIdx, stepTargetIndex));
    }
    setStepDragIdx(null);
    setStepDragDy(0);
  };

  const ingTargetIndex =
    ingDragIdx !== null
      ? Math.min(ingBaseOrder.length - 1, Math.max(0, ingDragIdx + Math.round(ingDragDy / ING_ROW_HEIGHT)))
      : -1;
  const ingDisplayOrder = ingDragIdx !== null ? moveItem(ingBaseOrder, ingDragIdx, ingTargetIndex) : ingredients;
  const ingRowOffset = ingDragIdx !== null ? ingDragDy - (ingTargetIndex - ingDragIdx) * ING_ROW_HEIGHT : 0;

  const startIngDrag = (idx: number) => {
    setIngBaseOrder(ingredients);
    setIngDragIdx(idx);
    setIngDragDy(0);
  };
  const onIngDragMove = (dy: number) => {
    if (ingDragIdx === null) return;
    const overshoot = ING_ROW_HEIGHT * 0.6;
    const min = -ingDragIdx * ING_ROW_HEIGHT - overshoot;
    const max = (ingBaseOrder.length - 1 - ingDragIdx) * ING_ROW_HEIGHT + overshoot;
    setIngDragDy(Math.min(max, Math.max(min, dy)));
  };
  const endIngDrag = () => {
    if (ingDragIdx !== null && ingTargetIndex !== ingDragIdx) {
      setIngredients(moveItem(ingBaseOrder, ingDragIdx, ingTargetIndex));
    }
    setIngDragIdx(null);
    setIngDragDy(0);
  };

  useEffect(() => {
    if (!onDirtyChange) return;
    const current: DishFormInitial = {
      name, emoji, imageUrl, category, courseType, calories, protein, carbs, fat, fiber,
      baseServings, prepMinutes, ingredients, steps, isReadyMade,
    };
    onDirtyChange(JSON.stringify(current) !== JSON.stringify(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, emoji, imageUrl, category, courseType, calories, protein, carbs, fat, fiber, baseServings, prepMinutes, ingredients, steps, isReadyMade]);

  const updateIngredient = (i: number, patch: Partial<IngredientDraft>) => {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));
  };

  const handleIngNameChange = (i: number, v: string) => {
    const patch: Partial<IngredientDraft> = { name: v };
    if (ingredients[i].grocery_category === 'autre') {
      const guess = guessGroceryCategory(v, groceryCategories);
      if (guess) patch.grocery_category = guess;
    }
    updateIngredient(i, patch);
  };

  const removeIngredient = (i: number) => {
    const run = () => setIngredients((prev) => prev.filter((_, idx) => idx !== i));
    if (!ingredients[i].name.trim()) {
      run();
      return;
    }
    const message = `Retirer "${ingredients[i].name}" de la recette ?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Retirer cet ingrédient ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: run },
    ]);
  };

  const removeStep = (i: number) => {
    const run = () => setSteps((prev) => prev.filter((_, idx) => idx !== i));
    if (!steps[i].trim()) {
      run();
      return;
    }
    const message = `Retirer l'étape ${i + 1} de la recette ?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Retirer cette étape ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: run },
    ]);
  };

  const courseTypeItem = courseTypes.find((c) => c.key === courseType);
  const courseTypeLabel = courseTypeItem ? `${courseTypeItem.icon ?? ''} ${courseTypeItem.label}`.trim() : courseType;
  const save = async () => {
    if (savingRef.current) return;
    if (!name.trim()) {
      setError('Donne un nom à ton plat.');
      return;
    }
    setError(null);
    savingRef.current = true;
    setSaving(true);
    try {
      const effectiveIngredients: IngredientDraft[] = isReadyMade
        ? [{ name: name.trim(), quantity: ingredients[0]?.quantity ?? '', unit: ingredients[0]?.unit ?? '', grocery_category: ingredients[0]?.grocery_category ?? 'autre' }]
        : ingredients;
      const knownNames = new Set(catalogItems.map((c) => c.name.trim().toLowerCase()));
      const newOnes = effectiveIngredients.filter((i) => i.name.trim() && !knownNames.has(i.name.trim().toLowerCase()));
      await Promise.all(
        newOnes.map((i) => ensureCatalogIngredient(session!.user.id, i.name, i.grocery_category, i.unit).catch(() => {})),
      );
      // Le formulaire n'est plus "sale" avant même de naviguer : onSubmit peut
      // déclencher une navigation immédiate (router.back()), et le garde-fou
      // "quitter sans enregistrer" (beforeRemove) interceptait cette navigation
      // programmatique tant que ce flag restait vrai — surtout visible sur mobile
      // où les événements tactiles/back arrivent plus vite que le re-render.
      onDirtyChange?.(false);
      await onSubmit({
        name: name.trim(),
        category: isReadyMade ? 'autre' : category,
        course_type: isReadyMade ? 'autre' : courseType,
        calories: calories.trim() ? Number(calories.replace(',', '.')) || null : null,
        protein_g: protein.trim() ? Number(protein.replace(',', '.')) || null : null,
        carbs_g: carbs.trim() ? Number(carbs.replace(',', '.')) || null : null,
        fat_g: fat.trim() ? Number(fat.replace(',', '.')) || null : null,
        fiber_g: fiber.trim() ? Number(fiber.replace(',', '.')) || null : null,
        base_servings: Math.max(1, Number(baseServings) || 4),
        prep_minutes: isReadyMade ? null : prepMinutes.trim() ? Math.max(0, Number(prepMinutes) || 0) : null,
        image_emoji: emoji.trim() || '🍽️',
        image_url: imageUrl,
        is_ready_made: isReadyMade,
        ingredients: effectiveIngredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            quantity: Number(i.quantity.replace(',', '.')) || 0,
            unit: i.unit.trim(),
            grocery_category: i.grocery_category,
          })),
        steps: isReadyMade ? [] : steps.map((s) => s.trim()).filter(Boolean),
      });
    } catch (e: any) {
      onDirtyChange?.(true);
      setError(e?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18 }} scrollEnabled={stepDragIdx === null && ingDragIdx === null}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.label, { color: colors.inkSoft }]}>Photo</Text>
          <Pressable
            onPress={() => setVisualMenuOpen(true)}
            style={[styles.emojiBox, { borderColor: colors.beigeDark, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}
          >
            {photoLoading ? (
              <ActivityIndicator size="small" color={colors.forest} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 18 }}>{emoji || '🍽️'}</Text>
            )}
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Nom du plat" value={name} onChangeText={setName} placeholder="Ex. Poêlée de légumes" />
          {isDuplicateName ? (
            <Text style={{ fontSize: 10.5, color: colors.honey, marginTop: -6, marginBottom: 6 }}>
              ⚠️ Une recette s'appelle déjà « {name.trim()} »
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={() => {
          setIsReadyMade((v) => !v);
          setIngredients((prev) => (prev.length === 0 ? [{ name: '', quantity: '', unit: '', grocery_category: 'autre' }] : prev));
        }}
        style={[
          styles.readyToggle,
          { borderColor: isReadyMade ? colors.forest : colors.beigeDark, backgroundColor: isReadyMade ? colors.sagePale : colors.paper },
        ]}
      >
        <Text style={{ fontSize: 16 }}>{isReadyMade ? '✅' : '⬜'}</Text>
        <Text style={{ fontSize: 12, color: colors.ink, flex: 1 }}>
          🛒 Alimentation (produit prêt à consommer, sans recette)
        </Text>
      </Pressable>

      {!isReadyMade ? (
        <>
          <Text style={[styles.label, { color: colors.inkSoft }]}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ marginBottom: 16 }, noSelectWebStyle]} ref={categoryDrag.ref} {...categoryDrag.handlers}>
            {categories.map((c) => (
              <Chip key={c.key} label={`${c.icon ?? ''} ${c.label}`.trim()} active={category === c.key} onPress={() => setCategory(c.key)} />
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.inkSoft }]}>Type de plat</Text>
          <Pressable onPress={() => setCourseTypeMenuOpen(true)} style={[styles.dropdown, { borderColor: colors.beigeDark, marginBottom: 16 }]}>
            <Text style={{ fontSize: 13, color: colors.ink }}>{courseTypeLabel}</Text>
            <Text style={{ color: colors.inkSoft }}>▾</Text>
          </Pressable>
        </>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {!isReadyMade ? (
          <View style={{ flex: 1 }}>
            <Field
              label="Temps de préparation (min)"
              value={prepMinutes}
              onChangeText={setPrepMinutes}
              keyboardType="numeric"
              placeholder="Ex. 20"
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Field
            label="Pour combien de personnes ?"
            value={baseServings}
            onChangeText={setBaseServings}
            keyboardType="numeric"
            placeholder="4"
          />
        </View>
      </View>

      {showNutrition ? (
        <>
          <Field
            label="Calories (optionnel, pour indiquer le total du repas)"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            placeholder="Ex. 550"
          />

          <Text style={[styles.label, { color: colors.inkSoft, marginTop: 4 }]}>Nutriments (optionnel, en grammes)</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Protéines" value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="30" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Glucides" value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="60" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Lipides" value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="15" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Fibres" value={fiber} onChangeText={setFiber} keyboardType="numeric" placeholder="8" />
            </View>
          </View>
        </>
      ) : null}

      {isReadyMade ? (
        <>
          <Text style={[styles.section, { color: colors.ink }]}>Cet article, tel qu'acheté</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Quantité"
                value={ingredients[0]?.quantity ?? ''}
                onChangeText={(v) => updateIngredient(0, { quantity: v })}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.inkSoft }]}>Unité</Text>
              <Pressable onPress={() => setUnitMenuFor(0)} style={[styles.dropdown, { borderColor: colors.beigeDark }]}>
                <Text style={{ fontSize: 13, color: ingredients[0]?.unit ? colors.ink : colors.inkFaint }}>
                  {ingredients[0]?.unit || 'Choisir'}
                </Text>
                <Text style={{ color: colors.inkSoft }}>▾</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.label, { color: colors.inkSoft }]}>Rayon</Text>
          <Pressable onPress={() => setReadyRayonMenuOpen(true)} style={[styles.dropdown, { borderColor: colors.beigeDark, marginBottom: 16 }]}>
            <Text style={{ fontSize: 13, color: colors.ink }}>
              {(() => {
                const g = groceryCategories.find((c) => c.key === (ingredients[0]?.grocery_category ?? 'autre'));
                return `${g?.icon ?? ''} ${g?.label ?? 'Autre'}`.trim();
              })()}
            </Text>
            <Text style={{ color: colors.inkSoft }}>▾</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.section, { color: colors.ink }]}>Ingrédients</Text>
          {ingDisplayOrder.map((ing, i) => (
            <IngredientRow
              key={i}
              ing={ing}
              dragging={ingDragIdx === i}
              dragOffset={ingDragIdx === i ? ingRowOffset : 0}
              onChangeName={(v) => handleIngNameChange(i, v)}
              onChangeQty={(v) => updateIngredient(i, { quantity: v })}
              onOpenUnitMenu={() => setUnitMenuFor(i)}
              onOpenPicker={() => setPickerFor(i)}
              onOpenEdit={() => setEditArticleFor(i)}
              onRemove={() => removeIngredient(i)}
              onDragStart={() => startIngDrag(i)}
              onDragMove={onIngDragMove}
              onDragEnd={endIngDrag}
            />
          ))}
          <Pill
            label="+ Ajouter un ingrédient"
            variant="ghost"
            onPress={() => setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '', grocery_category: 'autre' }])}
          />

          <Text style={[styles.section, { color: colors.ink, marginTop: 22 }]}>Étapes de la recette</Text>
          <Text style={[styles.label, { color: colors.inkSoft, textTransform: 'none', letterSpacing: 0 }]}>
            Étapes courantes (à ajouter puis ajuster) :
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ marginBottom: 10 }, noSelectWebStyle]} ref={stepSuggestionDrag.ref} {...stepSuggestionDrag.handlers}>
            {STEP_SUGGESTIONS.map((phrase) => (
              <Chip key={phrase} label={phrase} onPress={() => setSteps((prev) => [...prev.filter((s) => s.trim()), phrase])} />
            ))}
          </ScrollView>
          {stepDisplayOrder.map((s, i) => (
            <StepRow
              key={i}
              index={i}
              value={s}
              dragging={stepDragIdx === i}
              dragOffset={stepDragIdx === i ? stepRowOffset : 0}
              onChangeText={(v) => setSteps((prev) => prev.map((st, idx) => (idx === i ? v : st)))}
              onRemove={() => removeStep(i)}
              onDragStart={() => startStepDrag(i)}
              onDragMove={onStepDragMove}
              onDragEnd={endStepDrag}
            />
          ))}
          <Pill label="+ Ajouter une étape" variant="ghost" onPress={() => setSteps((prev) => [...prev, ''])} />
        </>
      )}

      {error ? <Text style={{ color: colors.danger, fontSize: 12.5, marginTop: 14, textAlign: 'center' }}>{error}</Text> : null}

      <View style={{ marginTop: 22 }}>
        <Pill label={saving ? 'Enregistrement…' : submitLabel} variant="primary" onPress={save} disabled={saving} />
      </View>

      <ActionSheet
        visible={courseTypeMenuOpen}
        title="Type de plat"
        actions={courseTypes.map((c) => ({ label: `${c.icon ?? ''} ${c.label}`.trim(), onPress: () => setCourseType(c.key) }))}
        onClose={() => setCourseTypeMenuOpen(false)}
      />

      <IngredientPicker
        visible={pickerFor !== null}
        items={catalogItems}
        groceryCategories={groceryCategories}
        onSelect={(item) => {
          if (pickerFor === null) return;
          updateIngredient(pickerFor, {
            name: item.name,
            grocery_category: item.grocery_category as GroceryCategory,
            unit: ingredients[pickerFor].unit || item.default_unit || '',
          });
        }}
        onCreateNew={(newName) => {
          if (pickerFor === null) return;
          updateIngredient(pickerFor, { name: newName });
        }}
        onCreateNewArticle={() => {
          if (pickerFor === null) return;
          setEditArticleFor(pickerFor);
        }}
        onClose={() => setPickerFor(null)}
      />

      <ArticleEditModal
        visible={editArticleFor !== null}
        item={
          editArticleFor !== null
            ? catalogItems.find((c) => c.name.trim().toLowerCase() === ingredients[editArticleFor].name.trim().toLowerCase()) ?? null
            : null
        }
        initialName={editArticleFor !== null ? ingredients[editArticleFor].name : undefined}
        groceryCategories={groceryCategories}
        showNutrition={showNutrition}
        onSave={async (patch) => {
          if (editArticleFor === null) return;
          const existing = catalogItems.find((c) => c.name.trim().toLowerCase() === ingredients[editArticleFor].name.trim().toLowerCase());
          let saved: CatalogIngredient;
          if (existing) {
            await updateCatalogIngredient(existing.id, patch);
            saved = { ...existing, ...patch } as CatalogIngredient;
            setCatalogItems((prev) => prev.map((c) => (c.id === existing.id ? saved : c)));
          } else {
            saved = await createCatalogIngredient(session!.user.id, patch);
            setCatalogItems((prev) => [...prev, saved]);
          }
          updateIngredient(editArticleFor, { name: saved.name, grocery_category: saved.grocery_category as GroceryCategory });
          setEditArticleFor(null);
        }}
        onDelete={
          editArticleFor !== null &&
          catalogItems.some((c) => c.name.trim().toLowerCase() === ingredients[editArticleFor].name.trim().toLowerCase())
            ? async () => {
                const existing = catalogItems.find((c) => c.name.trim().toLowerCase() === ingredients[editArticleFor!].name.trim().toLowerCase())!;
                await deleteCatalogIngredient(existing.id);
                setCatalogItems((prev) => prev.filter((c) => c.id !== existing.id));
                setEditArticleFor(null);
              }
            : undefined
        }
        onClose={() => setEditArticleFor(null)}
      />

      <ActionSheet
        visible={unitMenuFor !== null}
        title="Unité"
        actions={UNIT_OPTIONS.map((u) => ({ label: u.label, onPress: () => unitMenuFor !== null && updateIngredient(unitMenuFor, { unit: u.value }) }))}
        onClose={() => setUnitMenuFor(null)}
      />

      <ActionSheet
        visible={readyRayonMenuOpen}
        title="Rayon"
        actions={groceryCategories.map((g) => ({ label: `${g.icon ?? ''} ${g.label}`.trim(), onPress: () => updateIngredient(0, { grocery_category: g.key }) }))}
        onClose={() => setReadyRayonMenuOpen(false)}
      />


      <ActionSheet
        visible={visualMenuOpen}
        title="Image du plat"
        actions={[
          {
            label: imageUrl ? '📷 Changer la photo' : '📷 Ajouter une photo',
            onPress: async () => {
              setVisualMenuOpen(false);
              setPhotoLoading(true);
              try {
                const url = await pickAndUploadDishPhoto(session!.user.id);
                if (url) setImageUrl(url);
              } catch (e: any) {
                setError(e?.message ?? "Impossible d'ajouter la photo.");
              } finally {
                setPhotoLoading(false);
              }
            },
          },
          { label: '😀 Choisir un emoji', onPress: () => { setVisualMenuOpen(false); setEmojiPickerOpen(true); } },
          ...(imageUrl
            ? [{ label: "✕ Retirer la photo (revenir à l'emoji)", destructive: true, onPress: () => { setVisualMenuOpen(false); setImageUrl(null); } }]
            : []),
        ]}
        onClose={() => setVisualMenuOpen(false)}
      />
      <EmojiPicker visible={emojiPickerOpen} onSelect={setEmoji} onClose={() => setEmojiPickerOpen(false)} />
    </ScrollView>
  );
}

function StepRow({
  index,
  value,
  dragging,
  dragOffset,
  onChangeText,
  onRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  index: number;
  value: string;
  dragging: boolean;
  dragOffset: number;
  onChangeText: (v: string) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}) {
  const { colors } = useTheme();

  const callbacksRef = useRef({ onDragStart, onDragMove, onDragEnd });
  useEffect(() => {
    callbacksRef.current = { onDragStart, onDragMove, onDragEnd };
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => callbacksRef.current.onDragStart(),
      onPanResponderMove: (_e, gesture) => callbacksRef.current.onDragMove(gesture.dy),
      onPanResponderRelease: () => callbacksRef.current.onDragEnd(),
      onPanResponderTerminate: () => callbacksRef.current.onDragEnd(),
    }),
  ).current;

  return (
    <View
      style={[
        { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 6 },
        dragging ? { transform: [{ translateY: dragOffset }], zIndex: 10, opacity: 0.9 } : undefined,
      ]}
    >
      <View {...panResponder.panHandlers} hitSlop={8} style={[{ paddingHorizontal: 2, paddingTop: 8 }, dragHandleWebStyle]}>
        <Text style={{ fontSize: 14, color: colors.inkFaint }}>☰</Text>
      </View>
      <View style={[styles.stepNum, { backgroundColor: colors.sagePale, marginTop: 6 }]}>
        <Text style={{ fontSize: 10.5, fontFamily: fonts.bodySemiBold, color: colors.forest }}>{index + 1}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Décris cette étape…"
        placeholderTextColor={colors.inkFaint}
        multiline
        style={{
          flex: 1,
          minHeight: 60,
          borderWidth: 1.5,
          borderColor: colors.beigeDark,
          borderRadius: 8,
          paddingVertical: 7,
          paddingHorizontal: 10,
          fontSize: 12.5,
          color: colors.ink,
        }}
      />
      <Pressable onPress={onRemove} hitSlop={6} style={{ paddingHorizontal: 2 }}>
        <Text style={{ fontSize: 13, color: colors.danger }}>✕</Text>
      </Pressable>
    </View>
  );
}

function IngredientRow({
  ing,
  dragging,
  dragOffset,
  onChangeName,
  onChangeQty,
  onOpenUnitMenu,
  onOpenPicker,
  onOpenEdit,
  onRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  ing: IngredientDraft;
  dragging: boolean;
  dragOffset: number;
  onChangeName: (v: string) => void;
  onChangeQty: (v: string) => void;
  onOpenUnitMenu: () => void;
  onOpenPicker: () => void;
  onOpenEdit: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}) {
  const { colors } = useTheme();

  const callbacksRef = useRef({ onDragStart, onDragMove, onDragEnd });
  useEffect(() => {
    callbacksRef.current = { onDragStart, onDragMove, onDragEnd };
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => callbacksRef.current.onDragStart(),
      onPanResponderMove: (_e, gesture) => callbacksRef.current.onDragMove(gesture.dy),
      onPanResponderRelease: () => callbacksRef.current.onDragEnd(),
      onPanResponderTerminate: () => callbacksRef.current.onDragEnd(),
    }),
  ).current;

  const smallInput = { borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontSize: 12.5, color: colors.ink };

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 },
        dragging ? { transform: [{ translateY: dragOffset }], zIndex: 10, opacity: 0.9 } : undefined,
      ]}
    >
      <View {...panResponder.panHandlers} hitSlop={8} style={[{ paddingHorizontal: 1 }, dragHandleWebStyle]}>
        <Text style={{ fontSize: 13, color: colors.inkFaint }}>☰</Text>
      </View>
      <View style={{ flex: 1.8, position: 'relative', justifyContent: 'center' }}>
        <TextInput
          value={ing.name}
          onChangeText={onChangeName}
          placeholder="Nom de l'ingrédient"
          placeholderTextColor={colors.inkFaint}
          style={[smallInput, { paddingRight: 42 }]}
        />
        <View style={{ position: 'absolute', right: 4, flexDirection: 'row', gap: 4 }}>
          <Pressable onPress={onOpenPicker} hitSlop={6} style={{ padding: 2 }}>
            <Text style={{ fontSize: 12.5 }}>🔍</Text>
          </Pressable>
          <Pressable onPress={onOpenEdit} disabled={!ing.name.trim()} hitSlop={6} style={{ padding: 2, opacity: ing.name.trim() ? 1 : 0.4 }}>
            <Text style={{ fontSize: 12.5 }}>✏️</Text>
          </Pressable>
        </View>
      </View>
      <TextInput
        value={ing.quantity}
        onChangeText={onChangeQty}
        keyboardType="numeric"
        placeholder="Qté"
        placeholderTextColor={colors.inkFaint}
        style={[smallInput, { width: 42, textAlign: 'center' }]}
      />
      <Pressable onPress={onOpenUnitMenu} style={[smallInput, { width: 46, alignItems: 'center' }]}>
        <Text numberOfLines={1} style={{ fontSize: 11, color: ing.unit ? colors.ink : colors.inkFaint }}>
          {ing.unit || 'Unité'}
        </Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={6} style={{ paddingHorizontal: 2 }}>
        <Text style={{ fontSize: 13, color: colors.danger }}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10.5, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.bodySemiBold },
  section: { fontSize: 16, fontStyle: 'italic', marginBottom: 10 },
  stepNum: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emojiBox: { width: 40, height: 40, borderWidth: 1.5, borderRadius: 10, fontSize: 18, textAlign: 'center', textAlignVertical: 'center' },
  readyToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, padding: 10, marginBottom: 16 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
});
