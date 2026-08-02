import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { ActionSheet } from '../src/components/ActionSheet';
import { ArticleEditModal } from '../src/components/ArticleEditModal';
import {
  CatalogIngredient,
  createCatalogIngredient,
  deleteCatalogIngredient,
  listCatalogIngredients,
  updateCatalogIngredient,
} from '../src/data/ingredientsCatalog';
import { getProfile } from '../src/data/profile';
import { useTaxonomies } from '../src/lib/taxonomies';
import { fonts, radii } from '../src/theme/tokens';

export default function Articles() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { groceryCategories } = useTaxonomies();

  const [items, setItems] = useState<CatalogIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showNutrition, setShowNutrition] = useState(false);
  const [editing, setEditing] = useState<CatalogIngredient | null | 'new'>(null);
  const [rayonFilter, setRayonFilter] = useState<string | null>(null);
  const [rayonMenuOpen, setRayonMenuOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listCatalogIngredients(), getProfile(userId)])
      .then(([list, profile]) => {
        setItems(list);
        setShowNutrition(profile.show_nutrition_fields);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => !rayonFilter || i.grocery_category === rayonFilter)
      .filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [items, query, rayonFilter]);

  const rayonFilterItem = groceryCategories.find((g) => g.key === rayonFilter);

  const grouped = useMemo(() => {
    const byRayon = new Map<string, CatalogIngredient[]>();
    for (const item of filtered) {
      const list = byRayon.get(item.grocery_category) ?? [];
      list.push(item);
      byRayon.set(item.grocery_category, list);
    }
    return groceryCategories.map((g) => ({ rayon: g, items: byRayon.get(g.key) ?? [] })).filter((s) => s.items.length > 0);
  }, [filtered, groceryCategories]);

  return (
    <Screen>
      <ScreenHeader
        title="Liste d'articles"
        subtitle={`${items.length} article${items.length > 1 ? 's' : ''}`}
        onBack={() => router.back()}
        right={<Pill label="+ Nouvel article" onPress={() => setEditing('new')} />}
      />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 10 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un article..."
          placeholderTextColor={colors.inkFaint}
          style={{ flex: 1, borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: radii.sm, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13.5, color: colors.ink, backgroundColor: colors.paper }}
        />
        <Pressable
          onPress={() => setRayonMenuOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: radii.sm, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: colors.paper }}
        >
          <Text style={{ fontSize: 13 }}>{rayonFilterItem ? `${rayonFilterItem.icon ?? ''} ${rayonFilterItem.label}`.trim() : 'Tous les rayons'}</Text>
          <Text style={{ color: colors.inkSoft }}>▾</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingBlock />
      ) : grouped.length === 0 ? (
        <EmptyState text="Aucun article trouvé." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 6 }}>
          {grouped.map((section) => (
            <View key={section.rayon.id}>
              <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, color: colors.inkFaint, marginTop: 12, marginBottom: 6 }}>
                {section.rayon.icon ? `${section.rayon.icon} ` : ''}{section.rayon.label}
              </Text>
              {section.items.map((item) => (
                <Pressable key={item.id} onPress={() => setEditing(item)}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13.5, color: colors.ink }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.inkSoft }}>✏️</Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <ArticleEditModal
        visible={editing !== null}
        item={editing === 'new' ? null : editing}
        groceryCategories={groceryCategories}
        showNutrition={showNutrition}
        onSave={async (patch) => {
          if (editing === 'new') {
            const created = await createCatalogIngredient(userId, patch);
            setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (editing) {
            await updateCatalogIngredient(editing.id, patch);
            setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...patch } as CatalogIngredient : i)));
          }
          setEditing(null);
        }}
        onDelete={
          editing && editing !== 'new'
            ? async () => {
                await deleteCatalogIngredient(editing.id);
                setItems((prev) => prev.filter((i) => i.id !== editing.id));
                setEditing(null);
              }
            : undefined
        }
        onClose={() => setEditing(null)}
      />

      <ActionSheet
        visible={rayonMenuOpen}
        title="Filtrer par rayon"
        actions={[
          { label: 'Tous les rayons', onPress: () => setRayonFilter(null) },
          ...groceryCategories.map((g) => ({ label: `${g.icon ?? ''} ${g.label}`.trim(), onPress: () => setRayonFilter(g.key) })),
        ]}
        onClose={() => setRayonMenuOpen(false)}
      />
    </Screen>
  );
}
