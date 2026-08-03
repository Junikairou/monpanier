import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Checkbox, EmptyState, Field, InfoPressable, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
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
import { Dish, GroceryItem, Ingredient, PlanningEntry } from '../../../src/types/models';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { cardShadow, fonts, radii } from '../../../src/theme/tokens';
import { addDays, dayLabel, formatShortDayMonth, formatWeekOf, isToday, shortDayLabel, startOfWeek, toIso } from '../../../src/lib/dates';
import { CalendarPicker } from '../../../src/components/CalendarPicker';
import { PullToRefresh } from '../../../src/components/PullToRefresh';
import { formatQuantity } from '../../../src/lib/formatQuantity';

function ArrowBtn({ dir, onPress }: { dir: 'prev' | 'next'; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.arrowBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}>
      <Ionicons name={dir === 'prev' ? 'chevron-back' : 'chevron-forward'} size={13} color={colors.inkSoft} />
    </Pressable>
  );
}

export default function Courses() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { groceryCategories, label } = useTaxonomies();

  const [period, setPeriod] = useState<'jour' | 'semaine' | 'plage'>('semaine');
  const [anchor, setAnchor] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() => toIso(new Date()));
  const [rangeTo, setRangeTo] = useState(() => toIso(addDays(new Date(), 3)));
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [view, setView] = useState<'rayon' | 'plat'>('rayon');
  const [checkFilter, setCheckFilter] = useState<'tous' | 'restants' | 'coches'>('tous');

  const [list, setList] = useState<GroceryList>({ auto: [], manual: [] });
  const [planningEntries, setPlanningEntries] = useState<PlanningEntry[]>([]);
  const [dishIngredients, setDishIngredients] = useState<Record<string, Ingredient[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [collapseOverride, setCollapseOverride] = useState<Map<string, boolean>>(new Map());
  const [expandedDishBadges, setExpandedDishBadges] = useState<Set<string>>(new Set());
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState('');
  const [mQty, setMQty] = useState('');
  const [mUnit, setMUnit] = useState('');
  const scrollOffsetRef = useRef(0);
  const exportRef = useRef<View>(null);
  const [exporting, setExporting] = useState(false);

  const exportJpeg = async () => {
    if (Platform.OS !== 'web' || !exportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const node = exportRef.current as unknown as HTMLElement;
      const canvas = await html2canvas(node, { backgroundColor: colors.cream, scale: 2 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `liste-de-courses-${toIso(new Date())}.jpg`;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const rangeStart = period === 'jour' ? anchor : period === 'semaine' ? startOfWeek(anchor) : new Date(rangeFrom);
  const rangeEnd = period === 'jour' ? anchor : period === 'semaine' ? addDays(startOfWeek(anchor), 6) : new Date(rangeTo);
  const startIso = toIso(rangeStart);
  const endIso = toIso(rangeEnd);

  const goToday = () => {
    const today = new Date();
    setAnchor(today);
    setRangeFrom(toIso(today));
    setRangeTo(toIso(addDays(today, 3)));
  };

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
    setLoadError(null);
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
    } catch (e: any) {
      setLoadError(e?.message ?? 'Erreur de chargement inconnue.');
      setList({ auto: [], manual: [] });
      setPlanningEntries([]);
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

  const passFilter = (checked: boolean) =>
    checkFilter === 'tous' || (checkFilter === 'restants' && !checked) || (checkFilter === 'coches' && checked);

  const isCollapsed = (key: string, allChecked: boolean) => collapseOverride.get(key) ?? allChecked;
  const toggleCollapse = (key: string, allChecked: boolean) => {
    setCollapseOverride((prev) => {
      const next = new Map(prev);
      next.set(key, !isCollapsed(key, allChecked));
      return next;
    });
  };
  // Trie les groupes complets (100% cochés) en bas, en gardant l'ordre relatif au sein de chaque groupe.
  function sortComplete<T extends { allChecked: boolean }>(sections: T[]): T[] {
    return [...sections.filter((s) => !s.allChecked), ...sections.filter((s) => s.allChecked)];
  }

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

  interface RenderItem {
    keyId: string;
    checked: boolean;
    name: string;
    qty: string;
    onToggle: () => void;
    dishBadge?: React.ReactNode;
    dayBadgeNode?: React.ReactNode;
  }
  const toAutoRenderItem = (item: ComputedGroceryItem): RenderItem => ({
    keyId: item.key,
    checked: item.checked,
    name: item.name,
    qty: formatQuantity(item.quantity, item.unit) + ` ${item.unit}`,
    onToggle: () => onToggleAuto(item),
    dishBadge: dishOriginBadges(item.key, item.source_dish_ids),
    dayBadgeNode: dayBadge(item.dates),
  });
  const toManualRenderItem = (item: GroceryItem): RenderItem => ({
    keyId: item.id,
    checked: item.checked,
    name: item.name,
    qty: formatQuantity(item.quantity, item.unit) + ` ${item.unit}`,
    onToggle: () => onToggleManual(item),
  });

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
    router.push({ pathname: '/plat/[id]', params: { id: dishId } });
  };

  interface Section {
    key: string;
    icon: string;
    title: string;
    items: RenderItem[];
    allChecked: boolean;
  }

  const rayonSections: Section[] = (() => {
    const sections: Section[] = [];
    for (const gc of groceryCategories) {
      const allItems = list.auto.filter((i) => i.grocery_category === gc.key);
      if (allItems.length === 0) continue;
      const allChecked = allItems.every((i) => i.checked);
      const items = allItems.filter((i) => passFilter(i.checked)).map(toAutoRenderItem);
      if (items.length === 0) continue;
      sections.push({ key: `cat:${gc.key}`, icon: gc.icon ?? '📦', title: gc.label, items, allChecked });
    }
    const knownKeys = new Set(groceryCategories.map((gc) => gc.key));
    const leftoversAll = list.auto.filter((i) => !knownKeys.has(i.grocery_category));
    if (leftoversAll.length > 0) {
      const allChecked = leftoversAll.every((i) => i.checked);
      const items = leftoversAll.filter((i) => passFilter(i.checked)).map(toAutoRenderItem);
      if (items.length > 0) sections.push({ key: 'cat:autres', icon: '📦', title: 'Autres', items, allChecked });
    }
    if (list.manual.length > 0) {
      const allChecked = list.manual.every((i) => i.checked);
      const items = list.manual.filter((i) => passFilter(i.checked)).map(toManualRenderItem);
      if (items.length > 0) sections.push({ key: 'cat:manual', icon: '📝', title: 'Ajoutés manuellement', items, allChecked });
    }
    return sortComplete(sections);
  })();

  interface DishSection {
    kind: 'dish';
    key: string;
    dishId: string;
    dish: Dish;
    badgeText: string;
    allChecked: boolean;
    rows: { ingId: string; checked: boolean; name: string; qty: string; onToggle: () => void; sourceCount: number }[];
  }
  interface ManualSection {
    kind: 'manual';
    key: string;
    items: RenderItem[];
    allChecked: boolean;
  }
  const platSections: (DishSection | ManualSection)[] = (() => {
    const dishSecs: DishSection[] = dishGroups.map(({ dishId, dish, occurrences, ingredients }) => {
      const paired = ingredients
        .map((ing) => ({ ing, computed: itemByKey.get(`${ing.name.trim().toLowerCase()}::${ing.unit.trim().toLowerCase()}`) }))
        .filter((p): p is { ing: Ingredient; computed: ComputedGroceryItem } => !!p.computed);
      const allChecked = paired.length > 0 && paired.every((p) => p.computed.checked);
      const uniqueDays = Array.from(new Set(occurrences.map((o) => o.date))).sort();
      const scaleFactor = occurrences.reduce((sum, o) => sum + o.servings / (dish.base_servings || 1), 0);
      const badgeText =
        period === 'jour'
          ? `${shortDayLabel(new Date(occurrences[0].date))} · ${label('meal_slot', occurrences[0].slot)}`
          : occurrences.length > 1
            ? uniqueDays.map((d) => `${shortDayLabel(new Date(d))} ${new Date(d).getDate()}`).join(', ')
            : `${shortDayLabel(new Date(occurrences[0].date))} ${new Date(occurrences[0].date).getDate()}`;
      const rows = paired
        .filter((p) => passFilter(p.computed.checked))
        .map((p) => ({
          ingId: p.ing.id,
          checked: p.computed.checked,
          name: p.ing.name,
          qty: `${formatQuantity(p.ing.quantity * scaleFactor, p.ing.unit)} ${p.ing.unit}`,
          onToggle: () => onToggleAuto(p.computed),
          sourceCount: p.computed.source_dish_ids.length,
        }));
      return { kind: 'dish' as const, key: `dish:${dishId}`, dishId, dish, badgeText, allChecked, rows };
    }).filter((s) => s.rows.length > 0);

    const manualSecs: ManualSection[] = [];
    if (list.manual.length > 0) {
      const allChecked = list.manual.every((i) => i.checked);
      const items = list.manual.filter((i) => passFilter(i.checked)).map(toManualRenderItem);
      if (items.length > 0) manualSecs.push({ kind: 'manual', key: 'manual', items, allChecked });
    }
    return sortComplete([...dishSecs, ...manualSecs]);
  })();

  const dayBadge = (dates: string[]) => {
    if (period === 'jour' || dates.length === 0) return null;
    const label = dates.map((d) => formatShortDayMonth(new Date(d))).join(', ');
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

  const toggleDishBadgeExpanded = (rowKey: string) => {
    setExpandedDishBadges((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const dishOriginBadges = (rowKey: string, sourceDishIds: string[]) => {
    const known = sourceDishIds.filter((id) => dishById[id]);
    if (known.length === 0) return null;
    if (known.length === 1) {
      return (
        <Pressable onPress={() => goToDish(known[0])} style={[styles.dishPill, { backgroundColor: colors.sagePale }]}>
          <Text style={{ fontSize: 9, fontFamily: fonts.bodyMedium, color: colors.forestDark }}>{dishById[known[0]].name}</Text>
        </Pressable>
      );
    }
    const expanded = expandedDishBadges.has(rowKey);
    return (
      <>
        <Pressable onPress={() => toggleDishBadgeExpanded(rowKey)} style={[styles.sharedBadge, { backgroundColor: colors.honeyPale }]}>
          <Text style={{ fontSize: 9, fontFamily: fonts.bodySemiBold, color: colors.honey }}>
            🔗 dans {known.length} plats {expanded ? '▴' : '▾'}
          </Text>
        </Pressable>
        {expanded
          ? known.map((id) => (
              <Pressable key={id} onPress={() => goToDish(id)} style={[styles.dishPill, { backgroundColor: colors.sagePale }]}>
                <Text style={{ fontSize: 9, fontFamily: fonts.bodyMedium, color: colors.forestDark }}>{dishById[id].name}</Text>
              </Pressable>
            ))
          : null}
      </>
    );
  };

  const renderRow = (
    keyId: string,
    checked: boolean,
    onToggle: () => void,
    name: string,
    qty: string,
    dishBadge?: React.ReactNode,
    dayBadgeNode?: React.ReactNode,
  ) => (
    <View key={keyId} style={[styles.itemRow, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink, opacity: checked ? 0.5 : 1 }]}>
      <Checkbox checked={checked} onPress={onToggle} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 5 }}>
          <Text
            style={{ flexShrink: 1, fontSize: 12.5, fontFamily: fonts.bodyMedium, color: colors.ink, textDecorationLine: checked ? 'line-through' : 'none' }}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-end' }}>{dishBadge}</View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
          {qtyTag(qty)}
          {dayBadgeNode}
        </View>
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader
        title="Liste de courses"
        subtitle={`${totalCount} article${totalCount > 1 ? 's' : ''} · ${checkedCount} coché${checkedCount > 1 ? 's' : ''}`}
      />

      <View style={[styles.switchWrap, { backgroundColor: colors.beige }]}>
        <Pressable style={[styles.switchOpt, view === 'rayon' && { backgroundColor: colors.paper }]} onPress={() => setView('rayon')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: view === 'rayon' ? colors.ink : colors.inkSoft }}>🏷 Par catégorie</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, view === 'plat' && { backgroundColor: colors.paper }]} onPress={() => setView('plat')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: view === 'plat' ? colors.ink : colors.inkSoft }}>🍽 Par plat</Text>
        </Pressable>
      </View>

      <View style={[styles.switchWrap, { backgroundColor: colors.beige, marginTop: 8 }]}>
        <Pressable style={[styles.switchOpt, checkFilter === 'tous' && { backgroundColor: colors.paper }]} onPress={() => setCheckFilter('tous')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: checkFilter === 'tous' ? colors.ink : colors.inkSoft }}>Tous</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, checkFilter === 'restants' && { backgroundColor: colors.paper }]} onPress={() => setCheckFilter('restants')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: checkFilter === 'restants' ? colors.ink : colors.inkSoft }}>À acheter</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, checkFilter === 'coches' && { backgroundColor: colors.paper }]} onPress={() => setCheckFilter('coches')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: checkFilter === 'coches' ? colors.ink : colors.inkSoft }}>Cochés</Text>
        </Pressable>
      </View>

      <View style={[styles.switchWrap, { backgroundColor: colors.beige, marginTop: 8 }]}>
        <Pressable style={[styles.switchOpt, period === 'jour' && { backgroundColor: colors.paper }]} onPress={() => setPeriod('jour')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: period === 'jour' ? colors.ink : colors.inkSoft }}>Jour</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, period === 'semaine' && { backgroundColor: colors.paper }]} onPress={() => setPeriod('semaine')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: period === 'semaine' ? colors.ink : colors.inkSoft }}>Semaine</Text>
        </Pressable>
        <InfoPressable
          onPress={() => setPeriod('plage')}
          info={{
            title: 'Plage',
            text: "Choisis librement une date de début et une date de fin pour voir les courses sur une période précise, pratique quand tu fais tes courses tous les 2-3 jours.",
          }}
          style={[styles.switchOpt, period === 'plage' && { backgroundColor: colors.paper }]}
        >
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: period === 'plage' ? colors.ink : colors.inkSoft }}>Plage</Text>
        </InfoPressable>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 10, marginBottom: 14 }}>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ArrowBtn dir="prev" onPress={() => setAnchor(addDays(anchor, -7))} />
            <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>{formatWeekOf(startOfWeek(anchor))}</Text>
            <ArrowBtn dir="next" onPress={() => setAnchor(addDays(anchor, 7))} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {toIso(startOfWeek(anchor)) !== toIso(startOfWeek(new Date())) ? (
              <InfoPressable
                onPress={goToday}
                info={{ title: "Revenir à aujourd'hui", text: "Remet la liste de courses sur la semaine du jour." }}
                style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, borderColor: colors.beige }}
              >
                <Text style={{ fontSize: 11 }}>⟲</Text>
              </InfoPressable>
            ) : null}
          </View>
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
      ) : loadError ? (
        <View style={{ padding: 18 }}>
          <EmptyState text={`Erreur de chargement : ${loadError}`} />
        </View>
      ) : totalCount === 0 ? (
        <EmptyState text="Rien de planifié sur cette période. Ajoute des plats à ton planning pour générer la liste." />
      ) : (
        <View style={{ flex: 1 }}>
          <PullToRefresh onRefresh={load} scrollOffsetRef={scrollOffsetRef}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, paddingTop: 10, paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.forest} />}
            onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
          >
            <View ref={exportRef} collapsable={false} style={{ backgroundColor: colors.cream }}>
            {view === 'rayon' ? (
              rayonSections.length === 0 ? (
                <EmptyState text="Aucun article ne correspond à ce filtre." />
              ) : (
                rayonSections.map((section) => {
                  const collapsed = isCollapsed(section.key, section.allChecked);
                  return (
                    <View key={section.key}>
                      <Pressable
                        onPress={() => toggleCollapse(section.key, section.allChecked)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 }}
                        hitSlop={4}
                      >
                        <Text style={[styles.catLabel, { color: colors.inkFaint, marginTop: 0, marginBottom: 0, flex: 1 }]}>
                          {section.icon} {section.title} {section.allChecked ? '✓' : ''}
                        </Text>
                        <Text style={{ color: colors.inkFaint, fontSize: 11 }}>{collapsed ? '▸' : '▾'}</Text>
                      </Pressable>
                      {collapsed
                        ? null
                        : section.items.map((item) =>
                            renderRow(item.keyId, item.checked, item.onToggle, item.name, item.qty, item.dishBadge, item.dayBadgeNode),
                          )}
                    </View>
                  );
                })
              )
            ) : platSections.length === 0 ? (
              <EmptyState text="Aucun article ne correspond à ce filtre." />
            ) : (
              platSections.map((section) => {
                const collapsed = isCollapsed(section.key, section.allChecked);
                if (section.kind === 'manual') {
                  return (
                    <View key={section.key}>
                      <Pressable
                        onPress={() => toggleCollapse(section.key, section.allChecked)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 }}
                        hitSlop={4}
                      >
                        <Text style={[styles.catLabel, { color: colors.inkFaint, marginTop: 0, marginBottom: 0, flex: 1 }]}>
                          📝 Ajoutés manuellement {section.allChecked ? '✓' : ''}
                        </Text>
                        <Text style={{ color: colors.inkFaint, fontSize: 11 }}>{collapsed ? '▸' : '▾'}</Text>
                      </Pressable>
                      {collapsed
                        ? null
                        : section.items.map((item) =>
                            renderRow(item.keyId, item.checked, item.onToggle, item.name, item.qty, item.dishBadge, item.dayBadgeNode),
                          )}
                    </View>
                  );
                }
                const { dish, dishId, badgeText, allChecked, rows } = section;
                return (
                  <View
                    key={section.key}
                    style={[styles.dishSection, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink, opacity: allChecked ? 0.6 : 1 }]}
                  >
                    <Pressable
                      onPress={() => toggleCollapse(section.key, allChecked)}
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
                      <Text style={{ color: colors.inkFaint, fontSize: 11, marginLeft: 6 }}>{collapsed ? '▸' : '▾'}</Text>
                    </Pressable>
                    {collapsed
                      ? null
                      : rows.map((row, idx) => (
                          <View
                            key={row.ingId}
                            style={[styles.dishIngRow, { borderColor: colors.beige, borderBottomWidth: idx === rows.length - 1 ? 0 : 1 }]}
                          >
                            <Checkbox checked={row.checked} onPress={row.onToggle} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11.5, color: colors.ink, textDecorationLine: row.checked ? 'line-through' : 'none' }}>
                                {row.name}
                              </Text>
                              {row.sourceCount > 1 ? (
                                <Text style={{ fontSize: 9, color: colors.honey, marginTop: 2 }}>
                                  🔗 aussi dans {row.sourceCount - 1} autre(s) plat(s)
                                </Text>
                              ) : null}
                            </View>
                            <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>{row.qty}</Text>
                          </View>
                        ))}
                  </View>
                );
              })
            )}
            </View>

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
          </PullToRefresh>

          {!manualOpen ? (
            <>
              <Pressable
                onPress={exportJpeg}
                disabled={exporting}
                style={[styles.fab, { right: 74, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.beige, shadowColor: colors.ink, opacity: exporting ? 0.6 : 1 }]}
              >
                <Text style={{ fontSize: 18 }}>📸</Text>
              </Pressable>
              <Pressable onPress={() => setManualOpen(true)} style={[styles.fab, { backgroundColor: colors.forest, shadowColor: colors.forest }]}>
                <Text style={{ color: '#FFF', fontSize: 20, marginTop: -2 }}>＋</Text>
              </Pressable>
            </>
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
  rangeNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 18, marginTop: 10, marginBottom: 14 },
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
