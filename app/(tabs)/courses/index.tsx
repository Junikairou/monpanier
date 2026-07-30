import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Checkbox, EmptyState, Field, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import {
  addManualItem,
  ComputedGroceryItem,
  getGroceryListForRange,
  GroceryList,
  toggleAutoChecked,
  toggleManualChecked,
} from '../../../src/data/groceries';
import { listIngredients } from '../../../src/data/dishes';
import { listPlanningRange } from '../../../src/data/planning';
import { GROCERY_CATEGORY_LABELS, GroceryCategory, GroceryItem, Ingredient, MealSlot, PlanningEntry } from '../../../src/types/models';
import { cardShadow, fonts, radii } from '../../../src/theme/tokens';
import { addDays, dayLabel, formatWeekOf, shortDayLabel, startOfWeek, toIso } from '../../../src/lib/dates';

const GROCERY_CATEGORIES: GroceryCategory[] = [
  'fruits_legumes', 'viandes_poissons', 'epicerie', 'epicerie_salee', 'produits_laitiers', 'surgeles', 'boissons', 'autre',
];

const SLOT_SHORT: Record<MealSlot, string> = {
  petit_dej: 'P-déj',
  dejeuner: 'Déj.',
  gouter: 'Goûter',
  diner: 'Dîner',
  collation: 'Collation',
};

export default function Courses() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [period, setPeriod] = useState<'jour' | 'semaine'>('semaine');
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<'rayon' | 'plat'>('rayon');

  const [list, setList] = useState<GroceryList>({ auto: [], manual: [] });
  const [planningEntries, setPlanningEntries] = useState<PlanningEntry[]>([]);
  const [dishIngredients, setDishIngredients] = useState<Record<string, Ingredient[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedOverride, setExpandedOverride] = useState<Set<string>>(new Set());
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState('');
  const [mQty, setMQty] = useState('');
  const [mUnit, setMUnit] = useState('');

  const rangeStart = period === 'jour' ? anchor : startOfWeek(anchor);
  const rangeEnd = period === 'jour' ? anchor : addDays(startOfWeek(anchor), 6);
  const startIso = toIso(rangeStart);
  const endIso = toIso(rangeEnd);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, groceryList] = await Promise.all([
        listPlanningRange(userId, startIso, endIso),
        getGroceryListForRange(userId, startIso, endIso),
      ]);
      setPlanningEntries(entries);
      setList(groceryList);

      const dishIds = Array.from(new Set(entries.map((e) => e.dish_id).filter(Boolean) as string[]));
      const pairs = await Promise.all(dishIds.map(async (id) => [id, await listIngredients(id)] as const));
      setDishIngredients(Object.fromEntries(pairs));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, startIso, endIso]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const itemByKey = useMemo(() => new Map(list.auto.map((i) => [i.key, i])), [list.auto]);
  const totalCount = list.auto.length + list.manual.length;

  const onToggleAuto = async (item: ComputedGroceryItem) => {
    const next = !item.checked;
    setList((prev) => ({ ...prev, auto: prev.auto.map((i) => (i.key === item.key ? { ...i, checked: next } : i)) }));
    await toggleAutoChecked(userId, item, next);
  };

  const onToggleManual = async (item: GroceryItem) => {
    const next = !item.checked;
    setList((prev) => ({ ...prev, manual: prev.manual.map((i) => (i.id === item.id ? { ...i, checked: next } : i)) }));
    await toggleManualChecked(item.id, next);
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

  // group planning entries by dish for the "par plat" view
  const dishGroups = useMemo(() => {
    const byDish = new Map<string, PlanningEntry[]>();
    for (const e of planningEntries) {
      if (!e.dish_id || !e.dish) continue;
      const arr = byDish.get(e.dish_id) ?? [];
      arr.push(e);
      byDish.set(e.dish_id, arr);
    }
    return Array.from(byDish.entries()).map(([dishId, occs]) => ({
      dishId,
      dish: occs[0].dish!,
      occurrences: occs,
      ingredients: dishIngredients[dishId] ?? [],
    }));
  }, [planningEntries, dishIngredients]);

  const renderRow = (
    keyId: string,
    checked: boolean,
    onToggle: () => void,
    name: string,
    qty: string,
    badge?: React.ReactNode,
  ) => (
    <View key={keyId} style={[styles.itemRow, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink, opacity: checked ? 0.5 : 1 }]}>
      <Checkbox checked={checked} onPress={onToggle} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, color: colors.ink, textDecorationLine: checked ? 'line-through' : 'none' }}>{name}</Text>
        {badge}
      </View>
      <Text style={{ fontSize: 12, color: colors.inkSoft }}>{qty}</Text>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Liste de courses" subtitle={`${totalCount} article${totalCount > 1 ? 's' : ''}`} />

      <View style={[styles.switchWrap, { backgroundColor: colors.sagePale }]}>
        <Pressable style={[styles.switchOpt, view === 'rayon' && { backgroundColor: colors.paper }]} onPress={() => setView('rayon')}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodySemiBold, color: view === 'rayon' ? colors.forest : colors.inkSoft }}>Par rayon</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, view === 'plat' && { backgroundColor: colors.paper }]} onPress={() => setView('plat')}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodySemiBold, color: view === 'plat' ? colors.forest : colors.inkSoft }}>Par plat</Text>
        </Pressable>
      </View>

      <View style={[styles.switchWrap, { backgroundColor: colors.sagePale, marginTop: 8 }]}>
        <Pressable style={[styles.switchOpt, period === 'jour' && { backgroundColor: colors.paper }]} onPress={() => setPeriod('jour')}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodySemiBold, color: period === 'jour' ? colors.forest : colors.inkSoft }}>Jour</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, period === 'semaine' && { backgroundColor: colors.paper }]} onPress={() => setPeriod('semaine')}>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodySemiBold, color: period === 'semaine' ? colors.forest : colors.inkSoft }}>Semaine</Text>
        </Pressable>
      </View>

      {period === 'jour' ? (
        <View style={[styles.stripWrap, { backgroundColor: colors.paper, borderColor: colors.beigeDark }]}>
          <Pressable onPress={() => setAnchor(addDays(anchor, -1))} hitSlop={8} style={styles.stripArrow}>
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>‹</Text>
          </Pressable>
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((d) => {
            const selected = toIso(d) === toIso(anchor);
            return (
              <Pressable
                key={toIso(d)}
                onPress={() => setAnchor(d)}
                style={[styles.dayChip, { backgroundColor: selected ? colors.forest : 'transparent' }]}
              >
                <Text style={{ fontSize: 9, fontFamily: fonts.bodySemiBold, color: selected ? colors.paper : colors.inkFaint }}>{dayLabel(d)}</Text>
                <Text style={{ fontSize: 13, fontFamily: fonts.bodySemiBold, color: selected ? colors.paper : colors.ink, marginTop: 1 }}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setAnchor(addDays(anchor, 1))} hitSlop={8} style={styles.stripArrow}>
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>›</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.weekNav, { borderColor: colors.beigeDark }]}>
          <Pressable onPress={() => setAnchor(addDays(anchor, -7))} hitSlop={8}>
            <Text style={{ color: colors.forest, fontSize: 16 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 12, fontFamily: fonts.bodyMedium, color: colors.forestDark }}>{formatWeekOf(startOfWeek(anchor))}</Text>
          <Pressable onPress={() => setAnchor(addDays(anchor, 7))} hitSlop={8}>
            <Text style={{ color: colors.forest, fontSize: 16 }}>›</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <LoadingBlock />
      ) : totalCount === 0 ? (
        <EmptyState text="Rien de planifié sur cette période. Ajoute des plats à ton planning pour générer la liste." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 10 }}>
          {view === 'rayon' ? (
            <>
              {GROCERY_CATEGORIES.map((cat) => {
                const catItems = list.auto.filter((i) => i.grocery_category === cat);
                if (catItems.length === 0) return null;
                return (
                  <View key={cat}>
                    <Text style={[styles.catLabel, { color: colors.forest }]}>{GROCERY_CATEGORY_LABELS[cat]}</Text>
                    {catItems.map((item) =>
                      renderRow(
                        item.key,
                        item.checked,
                        () => onToggleAuto(item),
                        item.name,
                        `${item.quantity} ${item.unit}`,
                        item.source_dish_ids.length > 1 ? (
                          <View style={[styles.sharedBadge, { backgroundColor: colors.honeyPale, marginTop: 3 }]}>
                            <Text style={{ fontSize: 9.5, fontFamily: fonts.bodySemiBold, color: colors.honey }}>
                              🔗 dans {item.source_dish_ids.length} plats
                            </Text>
                          </View>
                        ) : undefined,
                      ),
                    )}
                  </View>
                );
              })}
              {list.manual.length > 0 ? (
                <View>
                  <Text style={[styles.catLabel, { color: colors.forest }]}>Ajoutés manuellement</Text>
                  {list.manual.map((item) =>
                    renderRow(item.id, item.checked, () => onToggleManual(item), item.name, `${item.quantity} ${item.unit}`),
                  )}
                </View>
              ) : null}
            </>
          ) : (
            dishGroups.map(({ dishId, dish, occurrences, ingredients }) => {
              const rows = ingredients.map((ing) => itemByKey.get(`${ing.name.trim().toLowerCase()}::${ing.unit.trim().toLowerCase()}`));
              const allChecked = rows.length > 0 && rows.every((r) => r?.checked);
              const collapsed = allChecked && !expandedOverride.has(dishId);
              const badgeText =
                occurrences.length > 1
                  ? `×${occurrences.length}`
                  : `${shortDayLabel(new Date(occurrences[0].date))} · ${SLOT_SHORT[occurrences[0].slot]}`;

              return (
                <Pressable
                  key={dishId}
                  onPress={() => {
                    if (!allChecked) return;
                    setExpandedOverride((prev) => {
                      const next = new Set(prev);
                      if (next.has(dishId)) next.delete(dishId);
                      else next.add(dishId);
                      return next;
                    });
                  }}
                  style={[styles.dishGroup, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink, opacity: allChecked ? 0.6 : 1 }]}
                >
                  <View style={styles.dishGroupHeader}>
                    <Text style={{ fontSize: 12.5, fontFamily: fonts.bodySemiBold, color: colors.ink }}>
                      {dish.image_emoji} {dish.name} {allChecked ? '✓' : ''}
                    </Text>
                    <View style={[styles.dishPill, { backgroundColor: colors.sagePale }]}>
                      <Text style={{ fontSize: 9.5, fontFamily: fonts.bodyMedium, color: colors.forestDark }}>{badgeText}</Text>
                    </View>
                  </View>
                  {collapsed ? null : (
                    <View style={{ gap: 8, marginTop: 4 }}>
                      {ingredients.map((ing) => {
                        const key = `${ing.name.trim().toLowerCase()}::${ing.unit.trim().toLowerCase()}`;
                        const computed = itemByKey.get(key);
                        if (!computed) return null;
                        return renderRow(
                          ing.id,
                          computed.checked,
                          () => onToggleAuto(computed),
                          ing.name,
                          `${ing.quantity * occurrences.length} ${ing.unit}`,
                          computed.source_dish_ids.length > 1 ? (
                            <Text style={{ fontSize: 9.5, color: colors.honey, marginTop: 2 }}>🔗 aussi dans {computed.source_dish_ids.length - 1} autre(s) plat(s)</Text>
                          ) : undefined,
                        );
                      })}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}

          {!manualOpen ? (
            <Pressable onPress={() => setManualOpen(true)} style={[styles.addManual, { borderColor: colors.sage }]}>
              <Text style={{ color: colors.forest, fontSize: 12.5, fontFamily: fonts.bodySemiBold }}>✎ Ajouter un ingrédient manuellement</Text>
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
  stripWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 10,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  stripArrow: { width: 18, alignItems: 'center' },
  dayChip: { flex: 1, paddingVertical: 5, borderRadius: 10, alignItems: 'center' },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 18,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  catLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, marginTop: 16, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: radii.md, marginBottom: 8 },
  dishGroup: { borderRadius: radii.lg, padding: 12, marginBottom: 10 },
  dishGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addManual: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.lg, padding: 12, alignItems: 'center', marginTop: 10 },
  manualPanel: { borderWidth: 1, borderRadius: radii.lg, padding: 14, marginTop: 10, gap: 4 },
  sharedBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: radii.pill, alignSelf: 'flex-start' },
  dishPill: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: radii.pill },
});
