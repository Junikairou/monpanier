import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card, Checkbox, Chip, LoadingBlock, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { createDish, DEMO_DISHES, listDishes, listIngredients, listPublicDishes, listRecipeSteps } from '../src/data/dishes';
import { getMyHouseholdId } from '../src/data/household';
import { getDisplayNamesByIds } from '../src/data/profile';
import { useTaxonomies } from '../src/lib/taxonomies';
import { Dish } from '../src/types/models';
import { fonts, radii } from '../src/theme/tokens';

export default function Catalogue() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { categories, label } = useTaxonomies();

  const [myDishes, setMyDishes] = useState<Dish[]>([]);
  const [publicDishes, setPublicDishes] = useState<Dish[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addingPublicId, setAddingPublicId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [previewDemoIndex, setPreviewDemoIndex] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listDishes(userId), listPublicDishes(), getMyHouseholdId(userId)])
      .then(async ([mine, pub, householdId]) => {
        setMyDishes(mine);
        const others = pub.filter((d) => d.household_id !== householdId);
        setPublicDishes(others);
        setAuthorNames(await getDisplayNamesByIds(Array.from(new Set(others.map((d) => d.user_id)))));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const myNames = new Set(myDishes.map((d) => d.name.trim().toLowerCase()));
  const q = query.trim().toLowerCase();

  const matchesQuery = (name: string, ingredientNames: string[]) =>
    !q || name.toLowerCase().includes(q) || ingredientNames.some((n) => n.toLowerCase().includes(q));

  const visiblePublic = useMemo(
    () =>
      publicDishes
        .filter((d) => !categoryFilter || d.category === categoryFilter)
        .filter((d) => matchesQuery(d.name, [])),
    [publicDishes, categoryFilter, q],
  );

  const visibleDemo = useMemo(
    () =>
      DEMO_DISHES.map((d, index) => ({ d, index }))
        .filter(({ d }) => !categoryFilter || d.category === categoryFilter)
        .filter(({ d }) => matchesQuery(d.name, d.ingredients.map((i) => i.name))),
    [categoryFilter, q],
  );

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

  const addPublicDish = async (dish: Dish) => {
    setAddingPublicId(dish.id);
    try {
      const [ingredients, steps] = await Promise.all([listIngredients(dish.id), listRecipeSteps(dish.id)]);
      await createDish(userId, {
        name: dish.name,
        category: dish.category,
        course_type: dish.course_type,
        calories: dish.calories,
        protein_g: dish.protein_g,
        carbs_g: dish.carbs_g,
        fat_g: dish.fat_g,
        fiber_g: dish.fiber_g,
        base_servings: dish.base_servings,
        prep_minutes: dish.prep_minutes,
        image_emoji: dish.image_emoji || '🍽️',
        ingredients: ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, grocery_category: i.grocery_category })),
        steps: steps.sort((a, b) => a.position - b.position).map((s) => s.instruction),
      });
      load();
    } finally {
      setAddingPublicId(null);
    }
  };

  const previewDemo = previewDemoIndex !== null ? DEMO_DISHES[previewDemoIndex] : null;

  return (
    <Screen>
      <ScreenHeader
        title="Catalogue de recettes"
        subtitle="Des idées prêtes à ajouter à Mes plats"
        onBack={() => router.back()}
        right={<Pill label="+ Créer" onPress={() => router.push('/(tabs)/plats/new')} />}
      />

      <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un plat ou un ingrédient..."
          placeholderTextColor={colors.inkFaint}
          style={{ borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: radii.sm, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13, color: colors.ink, backgroundColor: colors.paper }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 10 }}>
        <Chip label="Toutes" active={categoryFilter === null} onPress={() => setCategoryFilter(null)} />
        {categories.map((c) => (
          <Chip key={c.key} label={c.label} active={categoryFilter === c.key} onPress={() => setCategoryFilter(c.key)} />
        ))}
      </ScrollView>

      {loading ? (
        <LoadingBlock />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 0, gap: 10, paddingBottom: selected.size > 0 ? 90 : 18 }}>
          {visiblePublic.length > 0 ? (
            <>
              <Text style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, color: colors.inkFaint, marginBottom: 2 }}>
                🌍 Partagées par la communauté
              </Text>
              {visiblePublic.map((item) => {
                const already = myNames.has(item.name.trim().toLowerCase());
                const author = authorNames[item.user_id];
                return (
                  <Card key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, opacity: already ? 0.5 : 1 }}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/plat/[id]', params: { id: item.id } })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sagePale }}>
                        <Text style={{ fontSize: 20 }}>{item.image_emoji ?? '🍽️'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                          {label('course_type', item.course_type)} · {label('category', item.category)}
                        </Text>
                        <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>{item.name}</Text>
                        {author ? <Text style={{ fontSize: 10, color: colors.inkFaint, marginTop: 1 }}>par {author}</Text> : null}
                      </View>
                    </Pressable>
                    {already ? (
                      <Text style={{ fontSize: 16 }}>✓</Text>
                    ) : (
                      <Pill
                        label={addingPublicId === item.id ? '…' : '+ Ajouter'}
                        variant="primary"
                        disabled={addingPublicId !== null}
                        onPress={() => addPublicDish(item)}
                      />
                    )}
                  </Card>
                );
              })}
            </>
          ) : null}

          <Text style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, color: colors.inkFaint, marginTop: visiblePublic.length > 0 ? 8 : 0, marginBottom: 2 }}>
            📖 Exemples
          </Text>
          {visibleDemo.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: colors.inkFaint, fontStyle: 'italic', textAlign: 'center', padding: 12 }}>Aucun résultat.</Text>
          ) : (
            visibleDemo.map(({ d: item, index }) => {
              const already = myNames.has(item.name.trim().toLowerCase());
              return (
                <Card key={item.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, opacity: already ? 0.5 : 1 }}>
                  {already ? (
                    <Text style={{ fontSize: 16 }}>✓</Text>
                  ) : (
                    <Checkbox checked={selected.has(index)} onPress={() => toggleSelect(index)} />
                  )}
                  <Pressable onPress={() => setPreviewDemoIndex(index)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sagePale }}>
                      <Text style={{ fontSize: 20 }}>{item.image_emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                        {label('course_type', item.course_type)} · {label('category', item.category)}
                      </Text>
                      <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>{item.name}</Text>
                    </View>
                  </Pressable>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
      {selected.size > 0 ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, alignItems: 'center' }}>
          <Pill label={adding ? '…' : `Ajouter à Mes plats (${selected.size})`} variant="primary" disabled={adding} onPress={addSelected} />
        </View>
      ) : null}

      <Modal visible={previewDemo !== null} transparent animationType="fade" onRequestClose={() => setPreviewDemoIndex(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setPreviewDemoIndex(null)}>
          <Pressable
            style={{ width: '100%', maxWidth: 380, maxHeight: '80%', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, overflow: 'hidden' }}
            onPress={(e) => e.stopPropagation()}
          >
            {previewDemo ? (
              <ScrollView contentContainerStyle={{ padding: 18 }}>
                <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 6 }}>{previewDemo.image_emoji}</Text>
                <Text style={{ fontSize: 16, fontFamily: fonts.bodySemiBold, color: colors.ink, textAlign: 'center' }}>{previewDemo.name}</Text>
                <Text style={{ fontSize: 10.5, color: colors.inkFaint, textAlign: 'center', marginTop: 2, marginBottom: 14 }}>
                  {label('course_type', previewDemo.course_type)} · {label('category', previewDemo.category)}
                  {previewDemo.calories != null ? ` · 🔥 ${previewDemo.calories} kcal` : ''}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: fonts.bodySemiBold, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Ingrédients
                </Text>
                {previewDemo.ingredients.map((ing, i) => (
                  <Text key={i} style={{ fontSize: 12.5, color: colors.ink, marginBottom: 3 }}>
                    • {ing.name} — {ing.quantity} {ing.unit}
                  </Text>
                ))}
                <Text style={{ fontSize: 11, fontFamily: fonts.bodySemiBold, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 }}>
                  Étapes
                </Text>
                {previewDemo.steps.map((s, i) => (
                  <Text key={i} style={{ fontSize: 12.5, color: colors.ink, marginBottom: 6 }}>
                    {i + 1}. {s}
                  </Text>
                ))}
                <View style={{ marginTop: 14 }}>
                  <Pill
                    label="+ Ajouter à Mes plats"
                    variant="primary"
                    onPress={async () => {
                      if (previewDemoIndex === null) return;
                      await createDish(userId, DEMO_DISHES[previewDemoIndex]);
                      setPreviewDemoIndex(null);
                      load();
                    }}
                  />
                </View>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
