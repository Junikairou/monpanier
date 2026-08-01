import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Text } from '../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card, Checkbox, LoadingBlock, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { createDish, DEMO_DISHES, listDishes } from '../src/data/dishes';
import { useTaxonomies } from '../src/lib/taxonomies';
import { Dish } from '../src/types/models';
import { fonts } from '../src/theme/tokens';

export default function Catalogue() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { label } = useTaxonomies();

  const [myDishes, setMyDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listDishes()
      .then(setMyDishes)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const myNames = new Set(myDishes.map((d) => d.name.trim().toLowerCase()));

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const addSelected = async () => {
    setAdding(true);
    try {
      for (const idx of selected) await createDish(userId, DEMO_DISHES[idx]);
      setSelected(new Set());
      load();
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Catalogue de recettes"
        subtitle="Des idées prêtes à ajouter à Mes plats"
        onBack={() => router.back()}
        right={<Pill label="+ Créer" onPress={() => router.push('/(tabs)/plats/new')} />}
      />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={DEMO_DISHES}
          keyExtractor={(d) => d.name}
          contentContainerStyle={{ padding: 18, gap: 10, paddingBottom: selected.size > 0 ? 90 : 18 }}
          renderItem={({ item, index }) => {
            const already = myNames.has(item.name.trim().toLowerCase());
            return (
              <Card
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, opacity: already ? 0.5 : 1 }}
              >
                {already ? (
                  <Text style={{ fontSize: 16 }}>✓</Text>
                ) : (
                  <Checkbox checked={selected.has(index)} onPress={() => toggleSelect(index)} />
                )}
                <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sagePale }}>
                  <Text style={{ fontSize: 20 }}>{item.image_emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                    {label('course_type', item.course_type)} · {label('category', item.category)}
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>{item.name}</Text>
                </View>
              </Card>
            );
          }}
        />
      )}
      {selected.size > 0 ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, alignItems: 'center' }}>
          <Pill label={adding ? '…' : `Ajouter à Mes plats (${selected.size})`} variant="primary" disabled={adding} onPress={addSelected} />
        </View>
      ) : null}
    </Screen>
  );
}
