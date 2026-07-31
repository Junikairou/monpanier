import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { GroceryItem, Ingredient, MealSlot, PlanningEntry } from '../../../src/types/models';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { cardShadow, fonts, radii } from '../../../src/theme/tokens';
import { addDays, dayLabel, formatWeekOf, isToday, shortDayLabel, startOfWeek, toIso } from '../../../src/lib/dates';
import { CalendarPicker } from '../../../src/components/CalendarPicker';

const SLOT_SHORT: Record<MealSlot, string> = {
  petit_dej: 'P-déj',
  dejeuner: 'Déj.',
  gouter: 'Goûter',
  diner: 'Dîner',
  collation: 'Collation',
};

function ArrowBtn({ dir, onPress }: { dir: 'prev' | 'next'; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.arrowBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}>
      <Text style={{ color: colors.inkSoft, fontSize: 11 }}>{dir === 'prev' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

export default function Courses() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { groceryCategories } = useTaxonomies();

  const [period, setPeriod] = useState<'jour' | 'semaine' | 'plage'>('semaine');
  const [anchor, setAnchor] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() => toIso(new Date()));
  const [rangeTo, setRangeTo] = useState(() => toIso(addDays(new Date(), 3)));
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
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

  const rangeStart = period === 'jour' ? anchor : period === 'semaine' ? startOfWeek(anchor) : new Date(rangeFrom);
  const rangeEnd = period === 'jour' ? anchor : period === 'semaine' ? addDays(startOfWeek(anchor), 6) : new Date(rangeTo);
  const startIso = toIso(rangeStart);
  const endIso = toIso(rangeEnd);

  const pickFrom = (iso: string) => {
    setRangeFrom(iso);
    if (iso > rangeTo) setRangeTo(iso);
  };
  const pickTo = (iso: string) => {
    setRangeTo(iso);
    if (iso < rangeFrom) setRangeFrom(iso);
  };

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
  const dishById = useMemo(() => {
    const map: Record<string, { id: string; name: string; image_emoji: string | null }> = {};
    for (const e of planningEntries) if (e.dish) map[e.dish.id] = e.dish;
    return map;
  }, [planningEntries]);
  const totalCount = list.auto.length + list.manual.length;
  const checkedCount = list.auto.filter((i) => i.checked).length + list.manual.filter((i) => i.checked).length;

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

  const goToDish = (dishId: string) => {
    router.push({ pathname: '/(tabs)/plats/[id]', params: { id: dishId } });
  };

  const dayBadge = (dates: string[]) => {
    if (period === 'jour' || dates.length === 0) return null;
    const label = dates.map((d) => `${dayLabel(new Date(d))} ${new Date(d).getDate()}`).join(', ');
    return (
      <View style={[styles.dayTag, { backgroundColor: colors.beige }]}>
        <Text style={{ fontSize: 9.5, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>{label}</Text>
      </View>
    );
  };

  const qtyTag = (qty: string) => (
    <View style={[styles.qtyTag, { backgroundColor: colors.beige }]}>
      <Text style={{ fontSize: 10.5, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>{qty}</Text>
    </View>
  );

  const dishOriginBadges = (sourceDishIds: string[]) => {
    const known = sourceDishIds.filter((id) => dishById[id]);
    if (known.length === 0) return null;
    return (
      <>
        {known.length > 1 ? (
          <View style={[styles.sharedBadge, { backgroundColor: colors.honeyPale }]}>
            <Text style={{ fontSize: 9, fontFamily: fonts.bodySemiBold, color: colors.honey }}>
              🔗 dans {known.length} plats
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 9.5, color: colors.inkFaint }}>dans :</Text>
        )}
        {known.map((id) => (
          <Pressable key={id} onPress={() => goToDish(id)} style={[styles.dishPill, { backgroundColor: colors.sagePale }]}>
            <Text style={{ fontSize: 9, fontFamily: fonts.bodyMedium, color: colors.forestDark }}>{dishById[id].name}</Text>
          </Pressable>
        ))}
      </>
    );
  };

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
        <Text style={{ fontSize: 12.5, fontFamily: fonts.bodyMedium, color: colors.ink, textDecorationLine: checked ? 'line-through' : 'none' }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
          {qtyTag(qty)}
          {badge}
        </View>
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Liste de courses" subtitle={`${totalCount} article${totalCount > 1 ? 's' : ''} · ${checkedCount} coché${checkedCount > 1 ? 's' : ''}`} />

      <View style={[styles.switchWrap, { backgroundColor: colors.beige }]}>
        <Pressable style={[styles.switchOpt, view === 'rayon' && { backgroundColor: colors.paper }]} onPress={() => setView('rayon')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: view === 'rayon' ? colors.ink : colors.inkSoft }}>🏷 Par catégorie</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, view === 'plat' && { backgroundColor: colors.paper }]} onPress={() => setView('plat')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: view === 'plat' ? colors.ink : colors.inkSoft }}>🍽 Par plat</Text>
        </Pressable>
      </View>

      <View style={[styles.switchWrap, { backgroundColor: colors.beige, marginTop: 8 }]}>
        <Pressable style={[styles.switchOpt, period === 'jour' && { backgroundColor: colors.paper }]} onPress={() => setPeriod('jour')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: period === 'jour' ? colors.ink : colors.inkSoft }}>Jour</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, period === 'semaine' && { backgroundColor: colors.paper }]} onPress={() => setPeriod('semaine')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: period === 'semaine' ? colors.ink : colors.inkSoft }}>Semaine</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, period === 'plage' && { backgroundColor: colors.paper }]} onPress={() => setPeriod('plage')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: period === 'plage' ? colors.ink : colors.inkSoft }}>Plage</Text>
        </Pressable>
      </View>

      {period === 'jour' ? (
        <View style={styles.stripWrap}>
          <ArrowBtn dir="prev" onPress={() => setAnchor(addDays(anchor, -1))} />
          <View style={styles.weekStrip}>
            {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((d) => {
              const selected = toIso(d) === toIso(anchor);
              const today = isToday(d);
              return (
                <Pressable
                  key={toIso(d)}
                  onPress={() => setAnchor(d)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? colors.forest : colors.paper,
                      borderColor: selected ? colors.forest : today ? colors.forest : colors.beige,
                      borderWidth: today && !selected ? 2 : 1.5,
                      transform: today ? [{ scale: 1.08 }] : undefined,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 8.5, fontFamily: fonts.bodySemiBold, textTransform: 'uppercase', opacity: selected ? 1 : 0.7, color: selected ? colors.paper : colors.ink }}>{dayLabel(d)}</Text>
                  <Text style={{ fontSize: 13, fontFamily: fonts.bodySemiBold, color: selected ? colors.paper : colors.ink, marginTop: 1 }}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
          <ArrowBtn dir="next" onPress={() => setAnchor(addDays(anchor, 1))} />
        </View>
      ) : period === 'semaine' ? (
        <View style={styles.weekNav}>
          <ArrowBtn dir="prev" onPress={() => setAnchor(addDays(anchor, -7))} />
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>{formatWeekOf(startOfWeek(anchor))}</Text>
          <ArrowBtn dir="next" onPress={() => setAnchor(addDays(anchor, 7))} />
        </View>
      ) : (
        <View style={styles.rangeNav}>
          <Pressable onPress={() => setPickerTarget('from')} style={[styles.rangeBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}>
            <Text style={{ fontSize: 10, color: colors.inkFaint, fontFamily: fonts.bodyMedium }}>Du</Text>
            <Text style={{ fontSize: 12, color: colors.ink, fontFamily: fonts.bodySemiBold }}>{shortDayLabel(rangeStart)} {rangeStart.getDate()}</Text>
          </Pressable>
          <Text style={{ color: colors.inkFaint }}>→</Text>
          <Pressable onPress={() => setPickerTarget('to')} style={[styles.rangeBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}>
            <Text style={{ fontSize: 10, color: colors.inkFaint, fontFamily: fonts.bodyMedium }}>Au</Text>
            <Text style={{ fontSize: 12, color: colors.ink, fontFamily: fonts.bodySemiBold }}>{shortDayLabel(rangeEnd)} {rangeEnd.getDate()}</Text>
          </Pressable>
        </View>
      )}

      <CalendarPicker
        visible={pickerTarget !== null}
        selectedDate={pickerTarget === 'from' ? rangeFrom : rangeTo}
        onClose={() => setPickerTarget(null)}
        onSelect={(iso) => (pickerTarget === 'from' ? pickFrom(iso) : pickTo(iso))}
      />

      {loading ? (
        <LoadingBlock />
      ) : totalCount === 0 ? (
        <EmptyState text="Rien de planifié sur cette période. Ajoute des plats à ton planning pour générer la liste." />
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 10, paddingBottom: 80 }}>
            {view === 'rayon' ? (
              <>
                {groceryCategories.map((gc) => {
                  const cat = gc.key;
                  const catItems = list.auto.filter((i) => i.grocery_category === cat);
                  if (catItems.length === 0) return null;
                  return (
                    <View key={cat}>
                      <Text style={[styles.catLabel, { color: colors.inkFaint }]}>{gc.icon ?? '📦'} {gc.label}</Text>
                      {catItems.map((item) =>
                        renderRow(
                          item.key,
                          item.checked,
                          () => onToggleAuto(item),
                          item.name,
                          `${item.quantity} ${item.unit}`,
                          <>
                            {dayBadge(item.dates)}
                            {dishOriginBadges(item.source_dish_ids)}
                          </>,
                        ),
                      )}
                    </View>
                  );
                })}
                {list.manual.length > 0 ? (
                  <View>
                    <Text style={[styles.catLabel, { color: colors.inkFaint }]}>Ajoutés manuellement</Text>
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
                const uniqueDays = Array.from(new Set(occurrences.map((o) => o.date))).sort();
                const badgeText =
                  period === 'jour'
                    ? `${shortDayLabel(new Date(occurrences[0].date))} · ${SLOT_SHORT[occurrences[0].slot]}`
                    : occurrences.length > 1
                      ? uniqueDays.map((d) => `${shortDayLabel(new Date(d))} ${new Date(d).getDate()}`).join(', ')
                      : `${shortDayLabel(new Date(occurrences[0].date))} ${new Date(occurrences[0].date).getDate()}`;

                return (
                  <View
                    key={dishId}
                    style={[styles.dishSection, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink, opacity: allChecked ? 0.6 : 1 }]}
                  >
                    <Pressable
                      onPress={() => {
                        if (!allChecked) {
                          goToDish(dishId);
                          return;
                        }
                        setExpandedOverride((prev) => {
                          const next = new Set(prev);
                          if (next.has(dishId)) next.delete(dishId);
                          else next.add(dishId);
                          return next;
                        });
                      }}
                      onLongPress={() => goToDish(dishId)}
                      style={[styles.dishSectionHeader, { borderColor: colors.beige }]}
                    >
                      <Text style={{ fontSize: 16 }}>{dish.image_emoji}</Text>
                      <Text style={{ fontSize: 12.5, fontFamily: fonts.bodySemiBold, color: colors.ink, flex: 1 }}>
                        {dish.name} {allChecked ? '✓' : ''}
                      </Text>
                      <View style={[styles.dayTag, { backgroundColor: colors.beige }]}>
                        <Text style={{ fontSize: 9.5, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>{badgeText}</Text>
                      </View>
                    </Pressable>
                    {collapsed
                      ? null
                      : ingredients.map((ing, idx) => {
                          const key = `${ing.name.trim().toLowerCase()}::${ing.unit.trim().toLowerCase()}`;
                          const computed = itemByKey.get(key);
                          if (!computed) return null;
                          return (
                            <View
                              key={ing.id}
                              style={[
                                styles.dishIngRow,
                                { borderColor: colors.beige, borderBottomWidth: idx === ingredients.length - 1 ? 0 : 1 },
                              ]}
                            >
                              <Checkbox checked={computed.checked} onPress={() => onToggleAuto(computed)} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11.5, color: colors.ink, textDecorationLine: computed.checked ? 'line-through' : 'none' }}>
                                  {ing.name}
                                </Text>
                                {computed.source_dish_ids.length > 1 ? (
                                  <Text style={{ fontSize: 9, color: colors.honey, marginTop: 2 }}>
                                    🔗 aussi dans {computed.source_dish_ids.length - 1} autre(s) plat(s)
                                  </Text>
                                ) : null}
                              </View>
                              <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>
                                {ing.quantity * occurrences.length} {ing.unit}
                              </Text>
                            </View>
                          );
                        })}
                  </View>
                );
              })
            )}

            {manualOpen ? (
              <View style={[styles.manualPanel, { borderColor: colors.beige, backgroundColor: colors.paper }]}>
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
            ) : null}
          </ScrollView>

          {!manualOpen ? (
            <Pressable onPress={() => setManualOpen(true)} style={[styles.fab, { backgroundColor: colors.forest, shadowColor: colors.forest }]}>
              <Text style={{ color: '#FFF', fontSize: 20, marginTop: -2 }}>＋</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchWrap: { flexDirection: 'row', marginHorizontal: 18, marginTop: 12, borderRadius: radii.sm, padding: 3, gap: 2 },
  switchOpt: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 6 },
  stripWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 18, marginTop: 10 },
  weekStrip: { flex: 1, flexDirection: 'row', gap: 4 },
  arrowBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayChip: { flex: 1, minWidth: 30, paddingVertical: 13, paddingHorizontal: 2, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginHorizontal: 18, marginTop: 10 },
  rangeNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 18, marginTop: 10 },
  rangeBtn: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.sm, borderWidth: 1.5 },
  catLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, marginTop: 16, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 9, borderRadius: radii.sm, marginBottom: 8 },
  qtyTag: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: radii.tag },
  dishSection: { borderRadius: radii.sm, marginBottom: 10, overflow: 'hidden' },
  dishSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderBottomWidth: 1 },
  dayTag: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: radii.tag },
  dishIngRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  manualPanel: { borderWidth: 1, borderRadius: radii.lg, padding: 14, marginTop: 10, gap: 4 },
  sharedBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: radii.pill },
  dishPill: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: radii.pill },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
});
