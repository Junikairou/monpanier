import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { useTaxonomies } from '../lib/taxonomies';
import { useAuth } from '../lib/auth';
import { getProfile } from '../data/profile';
import { Chip, Field, Pill } from './ui';
import { ActionSheet } from './ActionSheet';
import { EmojiPicker } from './EmojiPicker';
import { NewDishInput } from '../data/dishes';
import { Category, CourseType, GroceryCategory } from '../types/models';

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
}

const EMPTY: DishFormInitial = {
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

export function DishForm({ initial = EMPTY, submitLabel, onSubmit }: DishFormProps) {
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
  const [grocMenuFor, setGrocMenuFor] = useState<number | null>(null);
  const [steps, setSteps] = useState<string[]>(initial.steps);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNutrition, setShowNutrition] = useState(true);

  useEffect(() => {
    getProfile(session!.user.id).then((p) => setShowNutrition(p.show_nutrition_fields));
  }, [session]);

  const updateIngredient = (i: number, patch: Partial<IngredientDraft>) => {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));
  };

  const courseTypeItem = courseTypes.find((c) => c.key === courseType);
  const courseTypeLabel = courseTypeItem ? `${courseTypeItem.icon ?? ''} ${courseTypeItem.label}`.trim() : courseType;
  const groceryLabel = (key: string) => groceryCategories.find((g) => g.key === key)?.label ?? key;

  const save = async () => {
    if (!name.trim()) {
      setError('Donne un nom à ton plat.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
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
      setError(e?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View>
          <Text style={[styles.label, { color: colors.inkSoft }]}>Emoji</Text>
          <Pressable onPress={() => setEmojiPickerOpen(true)} style={[styles.emojiBox, { borderColor: colors.beigeDark, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 24 }}>{emoji || '🍽️'}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Nom du plat" value={name} onChangeText={setName} placeholder="Ex. Poêlée de légumes" />
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

      <Field
        label="Temps de préparation (optionnel, en minutes)"
        value={prepMinutes}
        onChangeText={setPrepMinutes}
        keyboardType="numeric"
        placeholder="Ex. 20"
      />

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

      <Field
        label="Cette recette est prévue pour combien de personnes ?"
        value={baseServings}
        onChangeText={setBaseServings}
        keyboardType="numeric"
        placeholder="4"
      />

      <Text style={[styles.section, { color: colors.ink }]}>Ingrédients</Text>
      {ingredients.map((ing, i) => (
        <View key={i} style={[styles.ingRow, { borderColor: colors.line }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 2 }}>
              <Field label="Nom" value={ing.name} onChangeText={(v) => updateIngredient(i, { name: v })} placeholder="Riz basmati" />
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
          <Text style={[styles.label, { color: colors.inkSoft }]}>Rayon</Text>
          <Pressable onPress={() => setGrocMenuFor(i)} style={[styles.dropdown, { borderColor: colors.beigeDark }]}>
            <Text style={{ fontSize: 13, color: colors.ink }}>
              {groceryCategories.find((g) => g.key === ing.grocery_category)?.icon ?? ''} {groceryLabel(ing.grocery_category)}
            </Text>
            <Text style={{ color: colors.inkSoft }}>▾</Text>
          </Pressable>
        </View>
      ))}
      <Pill
        label="+ Ajouter un ingrédient"
        variant="ghost"
        onPress={() => setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '', grocery_category: 'autre' }])}
      />

      <Text style={[styles.section, { color: colors.ink, marginTop: 22 }]}>Étapes de la recette</Text>
      {steps.map((s, i) => (
        <Field
          key={i}
          label={`Étape ${i + 1}`}
          value={s}
          onChangeText={(v) => setSteps((prev) => prev.map((st, idx) => (idx === i ? v : st)))}
          placeholder="Décris cette étape…"
          multiline
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

      <ActionSheet
        visible={unitMenuFor !== null}
        title="Unité"
        actions={UNIT_OPTIONS.map((u) => ({ label: u, onPress: () => unitMenuFor !== null && updateIngredient(unitMenuFor, { unit: u }) }))}
        onClose={() => setUnitMenuFor(null)}
      />

      <ActionSheet
        visible={grocMenuFor !== null}
        title="Rayon"
        actions={groceryCategories.map((gc) => ({
          label: `${gc.icon ?? ''} ${gc.label}`.trim(),
          onPress: () => grocMenuFor !== null && updateIngredient(grocMenuFor, { grocery_category: gc.key }),
        }))}
        onClose={() => setGrocMenuFor(null)}
      />

      <EmojiPicker visible={emojiPickerOpen} onSelect={setEmoji} onClose={() => setEmojiPickerOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
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
