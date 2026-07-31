import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useTaxonomies } from '../lib/taxonomies';
import { Chip, Field, Pill } from './ui';
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
  ingredients: [{ name: '', quantity: '', unit: '', grocery_category: 'autre' }],
  steps: [''],
};

export function DishForm({ initial = EMPTY, submitLabel, onSubmit }: DishFormProps) {
  const { colors } = useTheme();
  const { categories, courseTypes, groceryCategories } = useTaxonomies();

  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [category, setCategory] = useState<Category>(initial.category);
  const [courseType, setCourseType] = useState<CourseType>(initial.courseType);
  const [calories, setCalories] = useState(initial.calories);
  const [protein, setProtein] = useState(initial.protein);
  const [carbs, setCarbs] = useState(initial.carbs);
  const [fat, setFat] = useState(initial.fat);
  const [fiber, setFiber] = useState(initial.fiber);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(initial.ingredients);
  const [steps, setSteps] = useState<string[]>(initial.steps);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateIngredient = (i: number, patch: Partial<IngredientDraft>) => {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));
  };

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18 }}>
      <Field label="Nom du plat" value={name} onChangeText={setName} placeholder="Ex. Poêlée de légumes" />
      <Field label="Emoji (aperçu visuel)" value={emoji} onChangeText={setEmoji} placeholder="🍽️" />

      <Text style={[styles.label, { color: colors.inkSoft }]}>Catégorie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {categories.map((c) => (
          <Chip key={c.key} label={c.label} active={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </ScrollView>

      <Text style={[styles.label, { color: colors.inkSoft }]}>Type de plat</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {courseTypes.map((c) => (
          <Chip key={c.key} label={c.label} active={courseType === c.key} onPress={() => setCourseType(c.key)} />
        ))}
      </ScrollView>

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

      <Text style={[styles.section, { color: colors.ink }]}>Ingrédients</Text>
      {ingredients.map((ing, i) => (
        <View key={i} style={[styles.ingRow, { borderColor: colors.line }]}>
          <Field label="Nom" value={ing.name} onChangeText={(v) => updateIngredient(i, { name: v })} placeholder="Riz basmati" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Quantité" value={ing.quantity} onChangeText={(v) => updateIngredient(i, { quantity: v })} keyboardType="numeric" placeholder="200" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Unité" value={ing.unit} onChangeText={(v) => updateIngredient(i, { unit: v })} placeholder="g" />
            </View>
          </View>
          <Text style={[styles.label, { color: colors.inkSoft }]}>Rayon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {groceryCategories.map((gc) => (
              <Chip
                key={gc.key}
                label={`${gc.icon ?? ''} ${gc.label}`.trim()}
                active={ing.grocery_category === gc.key}
                onPress={() => updateIngredient(i, { grocery_category: gc.key })}
              />
            ))}
          </ScrollView>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { fontSize: 16, fontStyle: 'italic', marginBottom: 10 },
  ingRow: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
});
