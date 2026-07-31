import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Chip, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { listDishes, seedDemoDishes } from '../../../src/data/dishes';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { Category, Dish } from '../../../src/types/models';
import { cardShadow, fonts, radii } from '../../../src/theme/tokens';

export default function PlatsIndex() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { categories, label } = useTaxonomies();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<Category | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listDishes()
      .then(setDishes)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = filter ? dishes.filter((d) => d.category === filter) : dishes;

  const onSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoDishes(session!.user.id);
      load();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Tous les plats" subtitle={`${dishes.length} plat${dishes.length > 1 ? 's' : ''}`} />
      <View style={styles.topActions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
          <Chip label="Tous" active={filter === null} onPress={() => setFilter(null)} />
          {categories.map((c) => (
            <Chip key={c.key} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
          ))}
        </ScrollView>
        <Pill label="+ Nouveau" variant="primary" onPress={() => router.push('/(tabs)/plats/new')} />
      </View>

      {loading ? (
        <LoadingBlock />
      ) : dishes.length === 0 ? (
        <View style={{ padding: 18 }}>
          <EmptyState text="Aucun plat pour l'instant." />
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            <Pill label="+ Créer un plat" variant="primary" onPress={() => router.push('/(tabs)/plats/new')} />
            <Pill label={seeding ? '…' : 'Ajouter des exemples'} onPress={onSeed} disabled={seeding} />
          </View>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/plats/[id]', params: { id: item.id } })}
              style={[styles.row, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink }]}
            >
              <View style={[styles.thumb, { backgroundColor: colors.sagePale }]}>
                <Text style={{ fontSize: 22 }}>{item.image_emoji ?? '🍽️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                  {label('category', item.category)}
                </Text>
                <Text style={{ fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>{item.name}</Text>
              </View>
              <Text style={{ color: colors.inkSoft, fontSize: 16 }}>›</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: radii.md },
  thumb: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
