import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Checkbox, EmptyState, Field, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { addManualItem, deleteGroceryItem, listGroceries, toggleChecked } from '../../../src/data/groceries';
import { listDishes } from '../../../src/data/dishes';
import { listIngredients } from '../../../src/data/dishes';
import { Dish, GROCERY_CATEGORY_LABELS, GroceryCategory, GroceryItem, Ingredient } from '../../../src/types/models';

const GROCERY_CATEGORIES: GroceryCategory[] = [
  'fruits_legumes', 'viandes_poissons', 'epicerie', 'epicerie_salee', 'produits_laitiers', 'surgeles', 'boissons', 'autre',
];

export default function Courses() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [dishIngredients, setDishIngredients] = useState<Record<string, Ingredient[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'rayon' | 'plat'>('rayon');
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState('');
  const [mQty, setMQty] = useState('');
  const [mUnit, setMUnit] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [grocery, allDishes] = await Promise.all([listGroceries(userId), listDishes()]);
      setItems(grocery);
      setDishes(allDishes);

      const dishIdsInList = Array.from(new Set(grocery.flatMap((g) => g.source_dish_ids)));
      const entries = await Promise.all(dishIdsInList.map(async (id) => [id, await listIngredients(id)] as const));
      setDishIngredients(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const dishById = useMemo(() => Object.fromEntries(dishes.map((d) => [d.id, d])), [dishes]);
  const itemByKey = useMemo(
    () => Object.fromEntries(items.map((i) => [`${i.name.trim().toLowerCase()}::${i.unit.trim().toLowerCase()}`, i])),
    [items],
  );

  const onToggle = async (item: GroceryItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    await toggleChecked(item.id, !item.checked);
  };

  const onDelete = async (item: GroceryItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await deleteGroceryItem(item.id);
  };

  const addManual = async () => {
    if (!mName.trim()) return;
    await addManualItem(userId, mName.trim(), Number(mQty.replace(',', '.')) || 0, mUnit.trim(), 'autre');
    setMName('');
    setMQty('');
    setMUnit('');
    setManualOpen(false);
    load();
  };

  const dishIdsWithItems = Array.from(new Set(items.flatMap((i) => i.source_dish_ids)));

  return (
    <Screen>
      <ScreenHeader title="Liste de courses" subtitle={`${items.length} article${items.length > 1 ? 's' : ''} · générés depuis le planning`} />

      <View style={[styles.switchWrap, { backgroundColor: colors.sagePale }]}>
        <Pressable style={[styles.switchOpt, view === 'rayon' && { backgroundColor: colors.paper }]} onPress={() => setView('rayon')}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: view === 'rayon' ? colors.forest : colors.inkSoft }}>Par rayon</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, view === 'plat' && { backgroundColor: colors.paper }]} onPress={() => setView('plat')}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: view === 'plat' ? colors.forest : colors.inkSoft }}>Par plat</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState text="Ta liste est vide. Ajoute des plats à ton planning pour la générer automatiquement." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 6 }}>
          {view === 'rayon'
            ? GROCERY_CATEGORIES.map((cat) => {
                const catItems = items.filter((i) => i.grocery_category === cat);
                if (catItems.length === 0) return null;
                return (
                  <View key={cat}>
                    <Text style={[styles.catLabel, { color: colors.forest }]}>{GROCERY_CATEGORY_LABELS[cat]}</Text>
                    {catItems.map((item) => (
                      <View key={item.id} style={[styles.itemRow, { borderColor: colors.line }]}>
                        <Checkbox checked={item.checked} onPress={() => onToggle(item)} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13.5, color: colors.ink, textDecorationLine: item.checked ? 'line-through' : 'none' }}>
                            {item.name}
                          </Text>
                          {item.source_dish_ids.length > 0 ? (
                            <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>
                              Dans{' '}
                              {item.source_dish_ids.length > 1
                                ? `${item.source_dish_ids.length} plats`
                                : ''}
                              {item.source_dish_ids.length > 1 ? ' — ' : ''}
                              {item.source_dish_ids.map((id) => dishById[id]?.name).filter(Boolean).join(', ')}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>Ajouté manuellement</Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                          {item.quantity} {item.unit}
                        </Text>
                        <Pressable onPress={() => onDelete(item)} hitSlop={8} style={{ marginLeft: 8 }}>
                          <Text style={{ color: colors.inkSoft, fontSize: 14 }}>✕</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                );
              })
            : dishIdsWithItems.map((dishId) => {
                const dish = dishById[dishId];
                const ings = dishIngredients[dishId] ?? [];
                if (!dish) return null;
                return (
                  <View key={dishId} style={[styles.dishGroup, { borderColor: colors.line, backgroundColor: colors.paper }]}>
                    <View style={styles.dishGroupHeader}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                        {dish.image_emoji} {dish.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{ings.length} ingr.</Text>
                    </View>
                    {ings.map((ing) => {
                      const key = `${ing.name.trim().toLowerCase()}::${ing.unit.trim().toLowerCase()}`;
                      const groceryItem = itemByKey[key];
                      return (
                        <View key={ing.id} style={styles.dishIngRow}>
                          {groceryItem ? (
                            <Checkbox checked={groceryItem.checked} onPress={() => onToggle(groceryItem)} />
                          ) : (
                            <View style={{ width: 20 }} />
                          )}
                          <Text style={{ flex: 1, fontSize: 12.5, color: colors.ink }}>{ing.name}</Text>
                          <Text style={{ fontSize: 11.5, color: colors.inkSoft }}>
                            {ing.quantity} {ing.unit}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}

          {!manualOpen ? (
            <Pressable onPress={() => setManualOpen(true)} style={[styles.addManual, { borderColor: colors.sage }]}>
              <Text style={{ color: colors.forest, fontSize: 12.5, fontWeight: '600' }}>✎ Ajouter un ingrédient manuellement</Text>
            </Pressable>
          ) : (
            <View style={[styles.manualPanel, { borderColor: colors.line, backgroundColor: colors.paper }]}>
              <Field label="Nom" value={mName} onChangeText={setMName} placeholder="Papier essuie-tout" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Quantité" value={mQty} onChangeText={setMQty} keyboardType="numeric" placeholder="1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Unité" value={mUnit} onChangeText={setMUnit} placeholder="paquet" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="Ajouter" variant="primary" onPress={addManual} />
                <Pill label="Annuler" variant="ghost" onPress={() => setManualOpen(false)} />
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchWrap: { flexDirection: 'row', marginHorizontal: 18, marginTop: 12, borderRadius: 12, padding: 3 },
  switchOpt: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  catLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  dishGroup: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  dishGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dishIngRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  addManual: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 10 },
  manualPanel: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10, gap: 4 },
});
