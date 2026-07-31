import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ScaledText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Chip, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { deleteDish, getDish, listIngredients, listRecipeSteps } from '../../../src/data/dishes';
import { getPlanningEntry, setEntryServings, setMeal, setMealRecurring } from '../../../src/data/planning';
import { getProfile } from '../../../src/data/profile';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { CalendarPicker } from '../../../src/components/CalendarPicker';
import { ActionSheet } from '../../../src/components/ActionSheet';
import {
  Dish,
  Ingredient,
  MEAL_SLOT_LABELS,
  MEAL_SLOT_ORDER,
  MealSlot,
  RecipeStep,
} from '../../../src/types/models';
import { formatDayCaption, toIso } from '../../../src/lib/dates';
import { fonts } from '../../../src/theme/tokens';

type Frequency = 'once' | 1 | 2 | 7 | 14 | 'custom';
const FREQUENCY_LABELS: Record<Exclude<Frequency, 'custom'>, string> = {
  once: 'Une fois',
  1: 'Tous les jours',
  2: 'Tous les 2 jours',
  7: 'Toutes les semaines',
  14: 'Une semaine sur deux',
};

export default function DishDetail() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId?: string }>();
  const { label } = useTaxonomies();

  const [dish, setDish] = useState<Dish | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [tab, setTab] = useState<'ingredients' | 'recette'>('ingredients');
  const [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState(toIso(new Date()));
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [planSlot, setPlanSlot] = useState<MealSlot>('diner');
  const [activeSlots, setActiveSlots] = useState<MealSlot[]>([...MEAL_SLOT_ORDER]);
  const [saving, setSaving] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [freqMenuOpen, setFreqMenuOpen] = useState(false);
  const [customDays, setCustomDays] = useState('3');
  const [endDate, setEndDate] = useState<string | null>(null);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [recurError, setRecurError] = useState<string | null>(null);
  const [previewServings, setPreviewServings] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, ing, st, profile, entry] = await Promise.all([
        getDish(id),
        listIngredients(id),
        listRecipeSteps(id),
        getProfile(session!.user.id),
        entryId ? getPlanningEntry(entryId) : Promise.resolve(null),
      ]);
      setDish(d);
      setIngredients(ing);
      setSteps(st);
      setActiveSlots(profile.active_slots?.length ? profile.active_slots : [...MEAL_SLOT_ORDER]);
      setPreviewServings(entry?.servings ?? d.base_servings);
    } finally {
      setLoading(false);
    }
  }, [id, session, entryId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmAdd = async () => {
    if (frequency !== 'once') {
      if (!endDate) {
        setRecurError('Choisis une date de fin pour la répétition.');
        return;
      }
      if (endDate < planDate) {
        setRecurError('La date de fin doit être après le jour de départ.');
        return;
      }
    }
    setRecurError(null);
    setSaving(true);
    try {
      if (frequency === 'once') {
        await setMeal(session!.user.id, planDate, planSlot, dish!);
        setConfirmMsg(`Ajouté au ${MEAL_SLOT_LABELS[planSlot].toLowerCase()} du ${planDate}`);
      } else {
        const intervalDays = frequency === 'custom' ? Math.max(1, Number(customDays) || 1) : frequency;
        await setMealRecurring(session!.user.id, dish!, planSlot, planDate, intervalDays, endDate!);
        setConfirmMsg(`Ajouté au planning jusqu'au ${endDate}`);
      }
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
        subtitle={`${label('course_type', dish.course_type)} · ${label('category', dish.category)}`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={[styles.hero, { backgroundColor: colors.sagePale }]}>
          <Text style={{ fontSize: 46 }}>{dish.image_emoji ?? '🍽️'}</Text>
        </View>
        {dish.prep_minutes != null ? (
          <Text style={{ textAlign: 'center', fontSize: 11.5, color: colors.inkSoft, marginBottom: 4 }}>
            ⏱️ {dish.prep_minutes} min
          </Text>
        ) : null}
        {dish.calories != null ? (
          <Text style={{ textAlign: 'center', fontSize: 12.5, color: colors.inkSoft, marginBottom: 4 }}>
            🔥 {dish.calories} kcal
          </Text>
        ) : null}
        {dish.protein_g != null || dish.carbs_g != null || dish.fat_g != null || dish.fiber_g != null ? (
          <Text style={{ textAlign: 'center', fontSize: 11, color: colors.inkFaint, marginBottom: 10 }}>
            {[
              dish.protein_g != null ? `P ${dish.protein_g} g` : null,
              dish.carbs_g != null ? `G ${dish.carbs_g} g` : null,
              dish.fat_g != null ? `L ${dish.fat_g} g` : null,
              dish.fiber_g != null ? `Fibres ${dish.fiber_g} g` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}

        <View style={[styles.tabStrip, { borderColor: colors.line, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>👤</Text>
              <Pressable
                onPress={() => {
                  const next = Math.max(1, (previewServings ?? dish.base_servings) - 1);
                  setPreviewServings(next);
                  if (entryId) setEntryServings(entryId, next);
                }}
                hitSlop={6}
              >
                <Text style={{ color: colors.forest, fontSize: 15 }}>–</Text>
              </Pressable>
              <Text style={{ fontSize: 12, color: colors.ink, minWidth: 14, textAlign: 'center' }}>{previewServings ?? dish.base_servings}</Text>
              <Pressable
                onPress={() => {
                  const next = (previewServings ?? dish.base_servings) + 1;
                  setPreviewServings(next);
                  if (entryId) setEntryServings(entryId, next);
                }}
                hitSlop={6}
              >
                <Text style={{ color: colors.forest, fontSize: 15 }}>+</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        {tab === 'ingredients' ? (
          <Text style={{ fontSize: 10, color: colors.inkFaint, textAlign: 'right', marginTop: -10, marginBottom: 10 }}>
            {entryId ? 'Portions pour ce repas planifié' : 'Aperçu — ne modifie pas la recette'}
          </Text>
        ) : null}

        {tab === 'ingredients' ? (
          ingredients.length === 0 ? (
            <Text style={{ color: colors.inkSoft, fontStyle: 'italic', fontSize: 13 }}>Aucun ingrédient renseigné.</Text>
          ) : (
            ingredients.map((ing) => {
              const factor = (previewServings ?? dish.base_servings) / (dish.base_servings || 1);
              const scaledQty = Math.round(ing.quantity * factor * 100) / 100;
              return (
                <View key={ing.id} style={[styles.ingredientRow, { borderColor: colors.line }]}>
                  <View>
                    <Text style={{ fontSize: 13.5, color: colors.ink }}>{ing.name}</Text>
                    <Text style={{ fontSize: 10, color: colors.inkSoft }}>{label('grocery_category', ing.grocery_category)}</Text>
                  </View>
                  <Text style={{ color: colors.inkSoft, fontSize: 12 }}>
                    {scaledQty} {ing.unit}
                  </Text>
                </View>
              );
            })
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
              <Pressable onPress={() => setDayPickerOpen(true)} style={[styles.endBtn, { borderColor: colors.beigeDark }]}>
                <Text style={{ fontSize: 12, color: colors.ink }}>📅 {formatDayCaption(new Date(planDate))}</Text>
              </Pressable>

              <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Repas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {MEAL_SLOT_ORDER.filter((s) => activeSlots.includes(s)).map((slot) => (
                  <Chip key={slot} label={MEAL_SLOT_LABELS[slot]} active={planSlot === slot} onPress={() => setPlanSlot(slot)} />
                ))}
              </ScrollView>

              <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Répétition</Text>
              <Pressable onPress={() => setFreqMenuOpen(true)} style={[styles.endBtn, { borderColor: colors.beigeDark }]}>
                <Text style={{ fontSize: 12, color: colors.ink }}>
                  {frequency === 'custom' ? `Tous les ${customDays} jours` : FREQUENCY_LABELS[frequency]} ▾
                </Text>
              </Pressable>
              {frequency !== 'once' ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {frequency === 'custom' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.inkSoft }}>Tous les</Text>
                      <TextInput
                        value={customDays}
                        onChangeText={setCustomDays}
                        keyboardType="numeric"
                        style={{ width: 44, textAlign: 'center', borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: 10, paddingVertical: 6, color: colors.ink }}
                      />
                      <Text style={{ fontSize: 12, color: colors.inkSoft }}>jours</Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => setEndPickerOpen(true)}
                    style={[styles.endBtn, { borderColor: colors.beigeDark }]}
                  >
                    <Text style={{ fontSize: 12, color: colors.ink }}>
                      {endDate ? `Jusqu'au ${endDate}` : 'Choisir la date de fin'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {recurError ? <Text style={{ color: colors.danger, fontSize: 11.5, marginTop: 8 }}>{recurError}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Pill label={saving ? '…' : 'Confirmer'} variant="primary" onPress={confirmAdd} disabled={saving} />
                <Pill label="Annuler" variant="ghost" onPress={() => setPlanOpen(false)} />
              </View>
            </View>
          )}
          <Pill label="✏️ Modifier la recette" variant="ghost" onPress={() => router.push({ pathname: '/(tabs)/plats/modifier', params: { id } })} />
          <Pill label="Supprimer ce plat" variant="ghost" onPress={onDelete} />
        </View>
      </ScrollView>

      <CalendarPicker
        visible={dayPickerOpen}
        selectedDate={planDate}
        onClose={() => setDayPickerOpen(false)}
        onSelect={(iso) => {
          setPlanDate(iso);
          setDayPickerOpen(false);
        }}
      />

      <CalendarPicker
        visible={endPickerOpen}
        selectedDate={endDate ?? planDate}
        onClose={() => setEndPickerOpen(false)}
        onSelect={(iso) => {
          setEndDate(iso);
          setEndPickerOpen(false);
        }}
      />

      <ActionSheet
        visible={freqMenuOpen}
        title="Répétition"
        actions={[
          { label: 'Une fois', onPress: () => setFrequency('once') },
          { label: 'Tous les jours', onPress: () => setFrequency(1) },
          { label: 'Tous les 2 jours', onPress: () => setFrequency(2) },
          { label: 'Toutes les semaines', onPress: () => setFrequency(7) },
          { label: 'Une semaine sur deux', onPress: () => setFrequency(14) },
          { label: 'Personnalisé (en jours)', onPress: () => setFrequency('custom') },
        ]}
        onClose={() => setFreqMenuOpen(false)}
      />
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
  endBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
});
