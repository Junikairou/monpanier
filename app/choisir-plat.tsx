import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Chip, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { listDishes } from '../src/data/dishes';
import { replaceMeal, setMeal } from '../src/data/planning';
import { replaceTemplateMeal, setTemplateMeal } from '../src/data/template';
import { CATEGORY_LABELS, Category, COURSE_TYPE_LABELS, Dish, MEAL_SLOT_LABELS, MealSlot } from '../src/types/models';
import { fonts } from '../src/theme/tokens';

const CATEGORIES: Category[] = ['rapide', 'healthy', 'pates', 'vege', 'autre'];
const WEEKDAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function ChoisirPlat() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; slot: MealSlot; entryId?: string; mode?: string; weekday?: string }>();
  const isTemplate = params.mode === 'template';

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | null>(null);

  useEffect(() => {
    listDishes()
      .then(setDishes)
      .finally(() => setLoading(false));
  }, []);

  const visible = filter ? dishes.filter((d) => d.category === filter) : dishes;

  const choose = async (dish: Dish) => {
    setSaving(dish.id);
    try {
      const userId = session!.user.id;
      if (isTemplate) {
        if (params.entryId) {
          await replaceTemplateMeal(params.entryId, dish);
        } else {
          await setTemplateMeal(userId, Number(params.weekday), params.slot, dish);
        }
      } else if (params.entryId) {
        await replaceMeal(userId, params.entryId, dish);
      } else {
        await setMeal(userId, params.date!, params.slot, dish);
      }
      router.back();
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={`${params.entryId ? 'Remplacer' : 'Ajouter'} — ${MEAL_SLOT_LABELS[params.slot]}`}
        subtitle={isTemplate ? WEEKDAY_NAMES[Number(params.weekday)] : params.date}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingVertical: 12 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
        <Chip label="Tous" active={filter === null} onPress={() => setFilter(null)} />
        {CATEGORIES.map((c) => (
          <Chip key={c} label={CATEGORY_LABELS[c]} active={filter === c} onPress={() => setFilter(c)} />
        ))}
      </ScrollView>

      {loading ? (
        <LoadingBlock />
      ) : visible.length === 0 ? (
        <EmptyState text="Aucun plat dans cette catégorie pour l'instant. Ajoute-en un depuis l'onglet Plats." />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => choose(item)}
              disabled={saving !== null}
              style={[styles.row, { backgroundColor: colors.paper, borderColor: colors.line, opacity: saving && saving !== item.id ? 0.5 : 1 }]}
            >
              <View style={[styles.thumb, { backgroundColor: colors.sagePale }]}>
                <Text style={{ fontSize: 22 }}>{item.image_emoji ?? '🍽️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                  {COURSE_TYPE_LABELS[item.course_type]} · {CATEGORY_LABELS[item.category]}
                </Text>
                <Text style={{ fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>{item.name}</Text>
                {item.calories != null ? (
                  <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 1 }}>🔥 {item.calories} kcal</Text>
                ) : null}
              </View>
              <Pill label={saving === item.id ? '…' : 'Choisir'} variant="primary" onPress={() => choose(item)} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: 16, borderWidth: 1 },
  thumb: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
