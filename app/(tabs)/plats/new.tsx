import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Chip, Field, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { createDish } from '../../../src/data/dishes';
import { CATEGORY_LABELS, Category, GROCERY_CATEGORY_LABELS, GroceryCategory } from '../../../src/types/models';

const CATEGORIES: Category[] = ['rapide', 'healthy', 'pates', 'vege', 'autre'];
const GROCERY_CATEGORIES: GroceryCategory[] = [
  'fruits_legumes', 'viandes_poissons', 'epicerie', 'epicerie_salee', 'produits_laitiers', 'surgeles', 'boissons', 'autre',
];

type IngredientDraft = { name: string; quantity: string; unit: string; grocery_category: GroceryCategory };

export default function NewDish() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [category, setCategory] = useState<Category>('rapide');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([
    { name: '', quantity: '', unit: '', grocery_category: 'autre' },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
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
      await createDish(session!.user.id, {
        name: name.trim(),
        category,
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
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Nouveau plat" />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Field label="Nom du plat" value={name} onChangeText={setName} placeholder="Ex. Poêlée de légumes" />
        <Field label="Emoji (aperçu visuel)" value={emoji} onChangeText={setEmoji} placeholder="🍽️" />

        <Text style={[styles.label, { color: colors.inkSoft }]}>Catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={CATEGORY_LABELS[c]} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

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
              {GROCERY_CATEGORIES.map((gc) => (
                <Chip
                  key={gc}
                  label={GROCERY_CATEGORY_LABELS[gc]}
                  active={ing.grocery_category === gc}
                  onPress={() => updateIngredient(i, { grocery_category: gc })}
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
          <Pill label={saving ? 'Enregistrement…' : 'Enregistrer le plat'} variant="primary" onPress={save} disabled={saving} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { fontSize: 16, fontStyle: 'italic', marginBottom: 10 },
  ingRow: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
});
