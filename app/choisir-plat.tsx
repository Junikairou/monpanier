import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/ScaledText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Chip, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { listDishes } from '../src/data/dishes';
import { replaceMeal, setMeal } from '../src/data/planning';
import { replaceTemplateMeal, setTemplateMeal } from '../src/data/template';
import { useTaxonomies } from '../src/lib/taxonomies';
import { Category, Dish, MealSlot } from '../src/types/models';
import { fonts } from '../src/theme/tokens';

const WEEKDAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function ChoisirPlat() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; slot: MealSlot; entryId?: string; mode?: string; weekday?: string }>();
  const isTemplate = params.mode === 'template';
  const { categories, label } = useTaxonomies();

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

  const createNew = () => {
    router.push({
      pathname: '/(tabs)/plats/new',
      params: {
        returnDate: params.date,
        returnSlot: params.slot,
        returnEntryId: params.entryId,
        returnMode: params.mode,
        returnWeekday: params.weekday,
        initialCategory: filter ?? undefined,
      },
    });
  };

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
        title={`${params.entryId ? 'Remplacer' : 'Ajouter'} — ${label('meal_slot', params.slot)}`}
        subtitle={isTemplate ? WEEKDAY_NAMES[Number(params.weekday)] : params.date}
        onBack={() => router.back()}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingVertical: 12 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
        <Chip label="Tous" active={filter === null} onPress={() => setFilter(null)} />
        {categories.map((c) => (
          <Chip key={c.key} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 10, justifyContent: 'center' }}>
        <Pill label="+ Créer un nouveau plat" variant="primary" onPress={createNew} />
        <Pill label="📖 Piocher dans le catalogue" onPress={() => router.push('/catalogue')} />
      </View>

      {loading ? (
        <LoadingBlock />
      ) : visible.length === 0 ? (
        <EmptyState text="Aucun plat dans cette catégorie pour l'instant." />
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
                  {label('course_type', item.course_type)} · {label('category', item.category)}
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
