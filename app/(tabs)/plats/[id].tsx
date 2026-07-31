import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Chip, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { deleteDish, getDish, listIngredients, listRecipeSteps } from '../../../src/data/dishes';
import { setMeal } from '../../../src/data/planning';
import {
  CATEGORY_LABELS,
  COURSE_TYPE_LABELS,
  Dish,
  GROCERY_CATEGORY_LABELS,
  Ingredient,
  MEAL_SLOT_LABELS,
  MEAL_SLOT_ORDER,
  MealSlot,
  RecipeStep,
} from '../../../src/types/models';
import { addDays, dayLabel, toIso } from '../../../src/lib/dates';
import { fonts } from '../../../src/theme/tokens';

export default function DishDetail() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [dish, setDish] = useState<Dish | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [tab, setTab] = useState<'ingredients' | 'recette'>('ingredients');
  const [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState(toIso(new Date()));
  const [planSlot, setPlanSlot] = useState<MealSlot>('diner');
  const [saving, setSaving] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, ing, st] = await Promise.all([getDish(id), listIngredients(id), listRecipeSteps(id)]);
      setDish(d);
      setIngredients(ing);
      setSteps(st);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const nextDays = Array.from({ length: 10 }, (_, i) => addDays(new Date(), i));

  const confirmAdd = async () => {
    setSaving(true);
    try {
      await setMeal(session!.user.id, planDate, planSlot, dish!);
      setConfirmMsg(`Ajouté au ${MEAL_SLOT_LABELS[planSlot].toLowerCase()} du ${planDate}`);
      setPlanOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    const run = async () => {
      await deleteDish(id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Supprimer ce plat ? Cette action est définitive.')) run();
      return;
    }
    Alert.alert('Supprimer ce plat ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: run },
    ]);
  };

  if (loading || !dish) {
    return (
      <Screen>
        <ScreenHeader title="Chargement…" />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={dish.name}
        subtitle={`${COURSE_TYPE_LABELS[dish.course_type]} · ${CATEGORY_LABELS[dish.category]}`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={[styles.hero, { backgroundColor: colors.sagePale }]}>
          <Text style={{ fontSize: 46 }}>{dish.image_emoji ?? '🍽️'}</Text>
        </View>
        {dish.calories != null ? (
          <Text style={{ textAlign: 'center', fontSize: 12.5, color: colors.inkSoft, marginBottom: 10 }}>
            🔥 {dish.calories} kcal
          </Text>
        ) : null}

        <View style={[styles.tabStrip, { borderColor: colors.line }]}>
          <Pressable onPress={() => setTab('ingredients')}>
            <Text style={[styles.tabText, { color: tab === 'ingredients' ? colors.forest : colors.inkSoft, fontWeight: tab === 'ingredients' ? '700' : '400' }]}>
              Ingrédients
            </Text>
          </Pressable>
          <Pressable onPress={() => setTab('recette')}>
            <Text style={[styles.tabText, { color: tab === 'recette' ? colors.forest : colors.inkSoft, fontWeight: tab === 'recette' ? '700' : '400' }]}>
              Recette
            </Text>
          </Pressable>
        </View>

        {tab === 'ingredients' ? (
          ingredients.length === 0 ? (
            <Text style={{ color: colors.inkSoft, fontStyle: 'italic', fontSize: 13 }}>Aucun ingrédient renseigné.</Text>
          ) : (
            ingredients.map((ing) => (
              <View key={ing.id} style={[styles.ingredientRow, { borderColor: colors.line }]}>
                <View>
                  <Text style={{ fontSize: 13.5, color: colors.ink }}>{ing.name}</Text>
                  <Text style={{ fontSize: 10, color: colors.inkSoft }}>{GROCERY_CATEGORY_LABELS[ing.grocery_category]}</Text>
                </View>
                <Text style={{ color: colors.inkSoft, fontSize: 12 }}>
                  {ing.quantity} {ing.unit}
                </Text>
              </View>
            ))
          )
        ) : steps.length === 0 ? (
          <Text style={{ color: colors.inkSoft, fontStyle: 'italic', fontSize: 13 }}>Aucune étape renseignée.</Text>
        ) : (
          steps.map((s) => (
            <View key={s.id} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: colors.sagePale }]}>
                <Text style={{ color: colors.forest, fontSize: 11, fontFamily: fonts.bodySemiBold }}>{s.position}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.ink }}>{s.instruction}</Text>
            </View>
          ))
        )}

        {confirmMsg ? (
          <Text style={{ color: colors.forest, fontSize: 12.5, marginTop: 14, textAlign: 'center' }}>{confirmMsg}</Text>
        ) : null}

        <View style={{ marginTop: 20, gap: 10 }}>
          {!planOpen ? (
            <Pill label="+ Ajouter au planning" variant="primary" onPress={() => setPlanOpen(true)} />
          ) : (
            <View style={[styles.planPanel, { borderColor: colors.line, backgroundColor: colors.paper }]}>
              <Text style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Jour</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {nextDays.map((d) => {
                  const iso = toIso(d);
                  return (
                    <Chip key={iso} label={`${dayLabel(d)} ${d.getDate()}`} active={planDate === iso} onPress={() => setPlanDate(iso)} />
                  );
                })}
              </ScrollView>
              <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Repas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {MEAL_SLOT_ORDER.map((slot) => (
                  <Chip key={slot} label={MEAL_SLOT_LABELS[slot]} active={planSlot === slot} onPress={() => setPlanSlot(slot)} />
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Pill label={saving ? '…' : 'Confirmer'} variant="primary" onPress={confirmAdd} disabled={saving} />
                <Pill label="Annuler" variant="ghost" onPress={() => setPlanOpen(false)} />
              </View>
            </View>
          )}
          <Pill label="Supprimer ce plat" variant="ghost" onPress={onDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 120, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  tabStrip: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, marginBottom: 14, paddingBottom: 8 },
  tabText: { fontSize: 13 },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderStyle: 'dashed' },
  step: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  planPanel: { borderWidth: 1, borderRadius: 16, padding: 14 },
});
