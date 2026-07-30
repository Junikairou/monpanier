import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Chip, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { listDishes, seedDemoDishes } from '../../../src/data/dishes';
import { CATEGORY_LABELS, Category, Dish } from '../../../src/types/models';

const CATEGORIES: Category[] = ['rapide', 'healthy', 'pates', 'vege', 'autre'];

export default function PlatsIndex() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();

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
          {CATEGORIES.map((c) => (
            <Chip key={c} label={CATEGORY_LABELS[c]} active={filter === c} onPress={() => setFilter(c)} />
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
              style={[styles.row, { backgroundColor: colors.paper, borderColor: colors.line }]}
            >
              <View style={[styles.thumb, { backgroundColor: colors.sagePale }]}>
                <Text style={{ fontSize: 22 }}>{item.image_emoji ?? '🍽️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.honey, fontWeight: '700' }}>
                  {CATEGORY_LABELS[item.category]}
                </Text>
                <Text style={{ fontSize: 15.5, fontStyle: 'italic', color: colors.ink, marginTop: 2 }}>{item.name}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: 16, borderWidth: 1 },
  thumb: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
