import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/ScaledText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Chip, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { DishThumb } from '../src/components/DishThumb';
import { listDishes } from '../src/data/dishes';
import { replaceMeal, setMeal } from '../src/data/planning';
import { replaceTemplateMeal, setTemplateMeal } from '../src/data/template';
import { useTaxonomies } from '../src/lib/taxonomies';
import { Category, Dish, MealSlot } from '../src/types/models';
import { fonts, radii } from '../src/theme/tokens';
import { noSelectWebStyle, useWebHorizontalDrag } from '../src/lib/webDragScroll';

const WEEKDAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function ChoisirPlat() {
  const { colors } = useTheme();
  const { session, guestMode } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; slot: MealSlot; entryId?: string; mode?: string; weekday?: string }>();
  const isTemplate = params.mode === 'template';
  const { categories, label } = useTaxonomies();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  const catDrag = useWebHorizontalDrag();

  useEffect(() => {
    listDishes(session!.user.id)
      .then(setDishes)
      .finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const minMatch = q.match(/(\d+)\s*min/);
  const maxMinutes = minMatch ? parseInt(minMatch[1], 10) : null;

  const visible = dishes
    .filter((d) => !filter || d.category === filter)
    .filter((d) => {
      if (maxMinutes !== null) return d.prep_minutes != null && d.prep_minutes <= maxMinutes;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        label('category', d.category).toLowerCase().includes(q) ||
        label('course_type', d.course_type).toLowerCase().includes(q)
      );
    });

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
      <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher (ex. asiatique, soupe, 30 min...)"
          placeholderTextColor={colors.inkFaint}
          style={{ borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: radii.sm, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13, color: colors.ink, backgroundColor: colors.paper }}
        />
      </View>
      <ScrollView
        ref={catDrag.ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[{ flexGrow: 0, paddingVertical: 12, marginHorizontal: 18 }, noSelectWebStyle]}
        contentContainerStyle={{ paddingRight: 4 }}
        {...catDrag.handlers}
      >
        <Chip label="Tous" active={filter === null} onPress={() => setFilter(null)} />
        {categories.map((c) => (
          <Chip key={c.key} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 10, justifyContent: 'center' }}>
        <Pill label="+ Créer un nouveau plat" variant="primary" onPress={createNew} />
        {!guestMode ? <Pill label="📖 Piocher dans le catalogue" onPress={() => router.push('/catalogue')} /> : null}
      </View>

      {loading ? (
        <LoadingBlock />
      ) : visible.length === 0 ? (
        <EmptyState text="Aucun plat ne correspond." />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={visible}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => choose(item)}
              disabled={saving !== null}
              style={[styles.row, { backgroundColor: colors.paper, borderColor: colors.line, opacity: saving && saving !== item.id ? 0.5 : 1 }]}
            >
              <View style={[styles.thumb, { backgroundColor: colors.sagePale, overflow: 'hidden' }]}>
                <DishThumb imageUrl={item.image_url} emoji={item.image_emoji} size={44} radius={0} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                  {label('course_type', item.course_type)} · {label('category', item.category)}
                </Text>
                <Text style={{ fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>{item.name}</Text>
                {item.calories != null || item.prep_minutes != null ? (
                  <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 1 }}>
                    {[item.calories != null ? `🔥 ${item.calories} kcal` : null, item.prep_minutes != null ? `⏱️ ${item.prep_minutes} min` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
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
