import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
}

interface DishFormProps {
  initial?: DishFormInitial;
  submitLabel: string;
  onSubmit: (input: NewDishInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
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
};

const UNIT_OPTIONS = ['Pièce', 'Gramme', 'ML', 'Cuillère à soupe', 'Pincée'];
const STEP_ROW_HEIGHT = 66;

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
  const onStepDragMove = (dy: number) => setStepDragDy(dy);
  const endStepDrag = () => {
    if (stepDragIdx !== null && stepTargetIndex !== stepDragIdx) {
      setSteps(moveItem(stepBaseOrder, stepDragIdx, stepTargetIndex));
    }
    setStepDragIdx(null);
    setStepDragDy(0);
  };

  useEffect(() => {
    if (!onDirtyChange) return;
    const current: DishFormInitial = {
      name, emoji, category, courseType, calories, protein, carbs, fat, fiber,
      baseServings, prepMinutes, ingredients, steps,
    };
    onDirtyChange(JSON.stringify(current) !== JSON.stringify(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, emoji, category, courseType, calories, protein, carbs, fat, fiber, baseServings, prepMinutes, ingredients, steps]);

  const updateIngredient = (i: number, patch: Partial<IngredientDraft>) => {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));
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
      const knownNames = new Set(catalogItems.map((c) => c.name.trim().toLowerCase()));
      const newOnes = ingredients.filter((i) => i.name.trim() && !knownNames.has(i.name.trim().toLowerCase()));
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
        category,
        course_type: courseType,
        calories: calories.trim() ? Number(calories.replace(',', '.')) || null : null,
        protein_g: protein.trim() ? Number(protein.replace(',', '.')) || null : null,
        carbs_g: carbs.trim() ? Number(carbs.replace(',', '.')) || null : null,
        fat_g: fat.trim() ? Number(fat.replace(',', '.')) || null : null,
        fiber_g: fiber.trim() ? Number(fiber.replace(',', '.')) || null : null,
        base_servings: Math.max(1, Number(baseServings) || 4),
        prep_minutes: prepMinutes.trim() ? Math.max(0, Number(prepMinutes) || 0) : null,
        image_emoji: emoji.trim() || '🍽️',
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            quantity: Number(i.quantity.replace(',', '.')) || 0,
            unit: i.unit.trim(),
            grocery_category: i.grocery_category,
          })),
        steps: steps.map((s) => s.trim()).filter(Boolean),
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
    <ScrollView contentContainerStyle={{ padding: 18 }} scrollEnabled={stepDragIdx === null}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View>
          <Text style={[styles.label, { color: colors.inkSoft }]}>Emoji</Text>
          <Pressable onPress={() => setEmojiPickerOpen(true)} style={[styles.emojiBox, { borderColor: colors.beigeDark, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 24 }}>{emoji || '🍽️'}</Text>
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

      <Text style={[styles.label, { color: colors.inkSoft }]}>Catégorie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {categories.map((c) => (
          <Chip key={c.key} label={`${c.icon ?? ''} ${c.label}`.trim()} active={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </ScrollView>

      <Text style={[styles.label, { color: colors.inkSoft }]}>Type de plat</Text>
      <Pressable onPress={() => setCourseTypeMenuOpen(true)} style={[styles.dropdown, { borderColor: colors.beigeDark, marginBottom: 16 }]}>
        <Text style={{ fontSize: 13, color: colors.ink }}>{courseTypeLabel}</Text>
        <Text style={{ color: colors.inkSoft }}>▾</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Temps de préparation (min)"
            value={prepMinutes}
            onChangeText={setPrepMinutes}
            keyboardType="numeric"
            placeholder="Ex. 20"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Prévu pour combien de pers. ?"
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

      <Text style={[styles.section, { color: colors.ink }]}>Ingrédients</Text>
      {ingredients.map((ing, i) => (
        <View key={i} style={[styles.ingRow, { borderColor: colors.line }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 2, flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Nom"
                  value={ing.name}
                  onChangeText={(v) => {
                    const patch: Partial<IngredientDraft> = { name: v };
                    if (ing.grocery_category === 'autre') {
                      const guess = guessGroceryCategory(v, groceryCategories);
                      if (guess) patch.grocery_category = guess;
                    }
                    updateIngredient(i, patch);
                  }}
                  placeholder="Riz basmati"
                />
              </View>
              <Pressable
                onPress={() => setPickerFor(i)}
                style={[styles.dropdown, { paddingHorizontal: 10, marginBottom: 12, borderColor: colors.beigeDark }]}
              >
                <Text style={{ fontSize: 14 }}>🔍</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditArticleFor(i)}
                disabled={!ing.name.trim()}
                style={[styles.dropdown, { paddingHorizontal: 10, marginBottom: 12, borderColor: colors.beigeDark, opacity: ing.name.trim() ? 1 : 0.4 }]}
              >
                <Text style={{ fontSize: 14 }}>✏️</Text>
              </Pressable>
            </View>
            <View style={{ width: 45 }}>
              <Field
                label="Qté"
                value={ing.quantity}
                onChangeText={(v) => updateIngredient(i, { quantity: v })}
                keyboardType="numeric"
                placeholder="200"
              />
            </View>
            <View style={{ flex: 1.3 }}>
              <Text style={[styles.label, { color: colors.inkSoft }]}>Unité</Text>
              <Pressable onPress={() => setUnitMenuFor(i)} style={[styles.dropdown, { borderColor: colors.beigeDark }]}>
                <Text style={{ fontSize: 12.5, color: ing.unit ? colors.ink : colors.inkFaint }} numberOfLines={1}>
                  {ing.unit || 'Choisir'}
                </Text>
                <Text style={{ color: colors.inkSoft }}>▾</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
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
          onDragStart={() => startStepDrag(i)}
          onDragMove={onStepDragMove}
          onDragEnd={endStepDrag}
        />
      ))}
      <Pill label="+ Ajouter une étape" variant="ghost" onPress={() => setSteps((prev) => [...prev, ''])} />

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
        actions={UNIT_OPTIONS.map((u) => ({ label: u, onPress: () => unitMenuFor !== null && updateIngredient(unitMenuFor, { unit: u }) }))}
        onClose={() => setUnitMenuFor(null)}
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
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  index: number;
  value: string;
  dragging: boolean;
  dragOffset: number;
  onChangeText: (v: string) => void;
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
        { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 12 },
        dragging ? { transform: [{ translateY: dragOffset }], zIndex: 10, opacity: 0.9 } : undefined,
      ]}
    >
      <View {...panResponder.panHandlers} hitSlop={8} style={{ paddingHorizontal: 4, paddingVertical: 12 }}>
        <Text style={{ fontSize: 15, color: colors.inkFaint }}>☰</Text>
      </View>
      <View style={{ flex: 1, marginBottom: 0 }}>
        <Field label={`Étape ${index + 1}`} value={value} onChangeText={onChangeText} placeholder="Décris cette étape…" multiline />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10.5, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.bodySemiBold },
  section: { fontSize: 16, fontStyle: 'italic', marginBottom: 10 },
  ingRow: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  emojiBox: { width: 52, height: 52, borderWidth: 1.5, borderRadius: 12, fontSize: 24, textAlign: 'center', textAlignVertical: 'center' },
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
