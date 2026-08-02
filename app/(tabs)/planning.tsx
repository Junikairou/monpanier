import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../../src/components/ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card, Checkbox, InfoPressable, LoadingBlock, MiniButton, Screen } from '../../src/components/ui';
import { CalendarPicker } from '../../src/components/CalendarPicker';
import { PullToRefresh } from '../../src/components/PullToRefresh';
import { ActionSheet } from '../../src/components/ActionSheet';
import { addDays, dayLabel, formatDayCaption, formatWeekOf, isToday, startOfWeek, toIso, weekdayFull } from '../../src/lib/dates';
import { copyDay, copyWeek, hasEntriesInRange, listPlanningRange, removeMeal, setCooked } from '../../src/data/planning';
import { applyTemplateToWeek, saveTemplateFromWeek } from '../../src/data/template';
import { getProfile, updateProfile } from '../../src/data/profile';
import { useTaxonomies } from '../../src/lib/taxonomies';
import { CourseType, MealSlot, PlanningEntry } from '../../src/types/models';
import { fonts, radii } from '../../src/theme/tokens';

function ArrowBtn({ dir, onPress }: { dir: 'prev' | 'next'; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.arrowBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}>
      <Ionicons name={dir === 'prev' ? 'chevron-back' : 'chevron-forward'} size={13} color={colors.inkSoft} />
    </Pressable>
  );
}

export default function Planning() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { label, mealSlots } = useTaxonomies();
  const allSlotKeys = mealSlots.map((m) => m.key);
  const slotIcon = (key: MealSlot) => mealSlots.find((m) => m.key === key)?.icon ?? '';
  const { width: windowWidth } = useWindowDimensions();
  const weekScrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const dragState = useRef({ dragging: false, startX: 0, startScroll: 0 });

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toIso(new Date()));
  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlots, setActiveSlots] = useState<MealSlot[]>([]);
  const [addSlotMenuOpen, setAddSlotMenuOpen] = useState(false);
  const [showBalanceHint, setShowBalanceHint] = useState(true);
  const [viewMode, setViewMode] = useState<'jour' | 'semaine'>('jour');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [clipboard, setClipboard] = useState<{ type: 'day'; date: string } | { type: 'week'; weekStart: string } | null>(null);
  const [dayMenuFor, setDayMenuFor] = useState<string | null>(null);
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [conflictAction, setConflictAction] = useState<{ label: string; run: (mode: 'replace' | 'add') => Promise<void> } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, profile] = await Promise.all([
        listPlanningRange(userId, toIso(weekStart), toIso(addDays(weekStart, 6))),
        getProfile(userId),
      ]);
      setEntries(data);
      setActiveSlots(profile.active_slots?.length ? profile.active_slots : allSlotKeys);
      setShowBalanceHint(profile.show_balance_hint);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Erreur de chargement inconnue.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId, weekStart, mealSlots]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedDateObj = days.find((d) => toIso(d) === selectedDate) ?? new Date(selectedDate);

  const CARD_GAP = 8;
  const columnWidth = Math.floor((windowWidth - 18 * 2 - CARD_GAP * 2) / 3);

  useEffect(() => {
    if (viewMode !== 'semaine') return;
    const todayIdx = days.findIndex((d) => isToday(d));
    const offset = todayIdx >= 0 ? todayIdx : 0;
    weekScrollRef.current?.scrollTo({ x: offset * (columnWidth + CARD_GAP), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, weekStart, columnWidth]);

  const slotEntries = (slot: MealSlot) =>
    entries.filter((e) => e.date === selectedDate && e.slot === slot);

  const dayEntries = entries.filter((e) => e.date === selectedDate && e.dish_id);
  const totalCalories = dayEntries.reduce((sum, e) => sum + (e.dish?.calories ?? 0), 0);
  const hasCalorieData = dayEntries.some((e) => e.dish?.calories != null);
  const totalProtein = dayEntries.reduce((sum, e) => sum + (e.dish?.protein_g ?? 0), 0);
  const totalCarbs = dayEntries.reduce((sum, e) => sum + (e.dish?.carbs_g ?? 0), 0);
  const totalFat = dayEntries.reduce((sum, e) => sum + (e.dish?.fat_g ?? 0), 0);
  const totalFiber = dayEntries.reduce((sum, e) => sum + (e.dish?.fiber_g ?? 0), 0);
  const hasMacroData = dayEntries.some((e) => e.dish?.protein_g != null || e.dish?.carbs_g != null || e.dish?.fat_g != null || e.dish?.fiber_g != null);

  const BALANCE_TYPES: CourseType[] = ['plat', 'accompagnement', 'fruit'];
  const slotBalance = (slot: MealSlot) => {
    const list = slotEntries(slot).filter((e) => e.dish_id && e.dish);
    if (list.length === 0) return null;
    const present = new Set(list.map((e) => e.dish!.course_type));
    const missing = BALANCE_TYPES.filter((t) => !present.has(t));
    return { missing, balanced: missing.length === 0 };
  };

  const onAdd = (slot: MealSlot) => {
    router.push({ pathname: '/choisir-plat', params: { date: selectedDate, slot } });
  };

  const onRemove = async (entryId: string) => {
    await removeMeal(userId, entryId);
    load();
  };

  const onSeeRecipe = (dishId: string, entryId?: string) => {
    router.push({ pathname: '/plat/[id]', params: entryId ? { id: dishId, entryId } : { id: dishId } });
  };

  const onAddFor = (date: string, slot: MealSlot) => {
    router.push({ pathname: '/choisir-plat', params: { date, slot } });
  };

  const onToggleCooked = async (entryId: string, next: boolean) => {
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, is_cooked: next } : e)));
    await setCooked(entryId, next);
  };

  const inactiveSlots = mealSlots.filter((m) => !activeSlots.includes(m.key));

  const setSlotActive = async (key: MealSlot, active: boolean) => {
    const next = active ? [...activeSlots, key] : activeSlots.filter((s) => s !== key);
    if (next.length === 0) return;
    setActiveSlots(next);
    setAddSlotMenuOpen(false);
    await updateProfile(userId, { active_slots: next });
  };

  const getScrollNode = (): any =>
    (weekScrollRef.current as any)?.getScrollableNode?.() ?? (weekScrollRef.current as any);

  const webDragHandlers =
    Platform.OS === 'web'
      ? {
          onMouseDown: (e: any) => {
            const node = getScrollNode();
            if (!node) return;
            dragState.current = { dragging: true, startX: e.pageX, startScroll: node.scrollLeft };
          },
          onMouseMove: (e: any) => {
            if (!dragState.current.dragging) return;
            const node = getScrollNode();
            if (!node) return;
            node.scrollLeft = dragState.current.startScroll - (e.pageX - dragState.current.startX);
          },
          onMouseUp: () => {
            dragState.current.dragging = false;
          },
          onMouseLeave: () => {
            dragState.current.dragging = false;
          },
        }
      : {};

  const goPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goNextWeek = () => setWeekStart(addDays(weekStart, 7));

  const goToday = () => {
    setWeekStart(startOfWeek(new Date()));
    setSelectedDate(toIso(new Date()));
  };

  const goToDate = (iso: string) => {
    setWeekStart(startOfWeek(new Date(iso)));
    setSelectedDate(iso);
    setViewMode('jour');
  };

  const copyDayThen = (fromIso: string, toDateIso: string, mode: 'replace' | 'add') =>
    copyDay(userId, fromIso, toDateIso, mode).then(load);

  const copyWeekThen = (fromWeekIso: string, toWeekIso: string, mode: 'replace' | 'add') =>
    copyWeek(userId, fromWeekIso, toWeekIso, mode).then(load);

  const pasteDay = async (targetIso: string) => {
    if (clipboard?.type !== 'day') return;
    const fromIso = clipboard.date;
    const conflict = await hasEntriesInRange(userId, targetIso, targetIso);
    if (conflict) {
      setConflictAction({
        label: `Coller le ${weekdayFull(new Date(targetIso))} — des repas existent déjà`,
        run: (mode) => copyDayThen(fromIso, targetIso, mode),
      });
    } else {
      await copyDayThen(fromIso, targetIso, 'add');
    }
  };

  const pasteWeek = async (targetWeekIso: string) => {
    if (clipboard?.type !== 'week') return;
    const fromWeekIso = clipboard.weekStart;
    const targetEnd = toIso(addDays(new Date(targetWeekIso), 6));
    const conflict = await hasEntriesInRange(userId, targetWeekIso, targetEnd);
    if (conflict) {
      setConflictAction({
        label: `Coller cette semaine — des repas existent déjà`,
        run: (mode) => copyWeekThen(fromWeekIso, targetWeekIso, mode),
      });
    } else {
      await copyWeekThen(fromWeekIso, targetWeekIso, 'add');
    }
  };

  const openDayMenu = (iso: string) => setDayMenuFor(iso);

  const dayMenuActions = () => {
    if (!dayMenuFor) return [];
    const iso = dayMenuFor;
    const actions = [
      { label: '📋 Copier ce jour', onPress: () => setClipboard({ type: 'day', date: iso }) },
    ];
    if (clipboard?.type === 'day') {
      actions.push({ label: '📥 Coller ici', onPress: () => pasteDay(iso) });
    }
    return actions;
  };

  const applyTemplate = async () => {
    const weekIso = toIso(weekStart);
    const weekEnd = toIso(addDays(weekStart, 6));
    const conflict = await hasEntriesInRange(userId, weekIso, weekEnd);
    if (conflict) {
      setConflictAction({
        label: 'Appliquer le modèle — des repas existent déjà cette semaine',
        run: (mode) => applyTemplateToWeek(userId, weekIso, mode).then(load),
      });
    } else {
      await applyTemplateToWeek(userId, weekIso, 'add').then(load);
    }
  };

  const weekMenuActions = () => {
    const actions = [
      { label: '📋 Copier cette semaine', onPress: () => setClipboard({ type: 'week', weekStart: toIso(weekStart) }) },
    ];
    if (clipboard?.type === 'week') {
      actions.push({ label: '📥 Coller ici', onPress: () => pasteWeek(toIso(weekStart)) });
    }
    actions.push(
      { label: '⭐ Enregistrer comme modèle par défaut', onPress: () => saveTemplateFromWeek(userId, toIso(weekStart)) },
      { label: '✅ Appliquer le modèle par défaut', onPress: () => applyTemplate() },
      { label: '✏️ Modifier le modèle par défaut', onPress: () => router.push('/modele-semaine') },
    );
    return actions;
  };

  return (
    <Screen>
      <View style={[styles.header, { backgroundColor: colors.cream, borderColor: colors.line }]}>
        <Pressable onLongPress={() => setWeekMenuOpen(true)}>
          <Text style={[styles.title, { color: colors.ink }]}>Ma semaine</Text>
          <Text style={{ fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.body, marginTop: 2 }}>
            {formatWeekOf(weekStart)}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <InfoPressable
            onPress={() => router.push('/(tabs)/courses')}
            info={{ title: 'Liste de courses', text: 'Ouvre la liste de courses.' }}
            style={[styles.iconBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}
          >
            <Text style={{ fontSize: 13 }}>🛒</Text>
          </InfoPressable>
        </View>
      </View>

      <View style={[styles.switchWrap, { backgroundColor: colors.beige }]}>
        <Pressable style={[styles.switchOpt, viewMode === 'jour' && { backgroundColor: colors.paper }]} onPress={() => setViewMode('jour')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: viewMode === 'jour' ? colors.ink : colors.inkSoft }}>Jour</Text>
        </Pressable>
        <Pressable style={[styles.switchOpt, viewMode === 'semaine' && { backgroundColor: colors.paper }]} onPress={() => setViewMode('semaine')}>
          <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: viewMode === 'semaine' ? colors.ink : colors.inkSoft }}>Semaine</Text>
        </Pressable>
      </View>

      {loadError ? (
        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.danger, marginBottom: 8 }}>
          Erreur de chargement : {loadError}
        </Text>
      ) : null}

      {viewMode === 'jour' ? (
        <>
          <View style={styles.stripWrap}>
            <ArrowBtn dir="prev" onPress={goPrevWeek} />
            <View style={styles.weekStrip}>
              {days.map((d) => {
                const iso = toIso(d);
                const selected = iso === selectedDate;
                const today = isToday(d);
                const hasMeal = entries.some((e) => e.date === iso && (e.dish_id || e.is_restaurant));
                return (
                  <Pressable
                    key={iso}
                    onPress={() => {
                      setSelectedDate(iso);
                    }}
                    onLongPress={() => openDayMenu(iso)}
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
                    <Text style={{ fontSize: 8.5, fontFamily: fonts.bodySemiBold, letterSpacing: 0.3, textTransform: 'uppercase', opacity: selected ? 1 : 0.7, color: selected ? colors.paper : colors.ink }}>{dayLabel(d)}</Text>
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodySemiBold, color: selected ? colors.paper : colors.ink, marginTop: 1 }}>
                      {d.getDate()}
                    </Text>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        marginTop: 2,
                        backgroundColor: hasMeal ? (selected ? 'rgba(255,255,255,.7)' : colors.forest) : 'transparent',
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
            <ArrowBtn dir="next" onPress={goNextWeek} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 18 }}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setCalendarOpen(true)}>
              <Text style={{ textAlign: 'center', fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.bodyMedium, textDecorationLine: 'underline' }}>
                {formatDayCaption(selectedDateObj)}
              </Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {!isToday(selectedDateObj) ? (
                <InfoPressable
                  onPress={goToday}
                  info={{ title: "Revenir à aujourd'hui", text: "Remet le planning sur la date du jour." }}
                  style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, borderColor: colors.beige }}
                >
                  <Text style={{ fontSize: 10.5 }}>⟲</Text>
                </InfoPressable>
              ) : null}
            </View>
          </View>

          {hasCalorieData ? (
            <Text style={{ textAlign: 'center', fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.bodyMedium, marginBottom: hasMacroData ? 1 : 8 }}>
              🔥 {totalCalories} kcal sur la journée
            </Text>
          ) : null}
          {hasMacroData ? (
            <Text style={{ textAlign: 'center', fontSize: 9.5, color: colors.inkFaint, fontFamily: fonts.bodyMedium, marginBottom: 8 }}>
              P {totalProtein}g · G {totalCarbs}g · L {totalFat}g · Fibres {totalFiber}g
            </Text>
          ) : null}

          {loading ? (
            <LoadingBlock />
          ) : (
            <PullToRefresh onRefresh={load} scrollOffsetRef={scrollOffsetRef}>
            <FlatList
              data={allSlotKeys.filter((s) => activeSlots.includes(s))}
              keyExtractor={(s) => s}
              contentContainerStyle={{ padding: 18, paddingTop: 16, gap: 10 }}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.forest} />}
              onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
              ListFooterComponent={
                inactiveSlots.length > 0 ? (
                  <Pressable onPress={() => setAddSlotMenuOpen(true)} style={{ alignSelf: 'center', marginTop: 2, paddingVertical: 8, paddingHorizontal: 14 }}>
                    <Text style={{ color: colors.honey, fontSize: 12, fontFamily: fonts.bodyMedium }}>+ Activer un repas</Text>
                  </Pressable>
                ) : null
              }
              renderItem={({ item: slot }) => {
                // Filtre les entrées "fantômes" (sans plat ni marquage restaurant, ex. reliquat d'un
                // bug de création) avant de calculer les index : sinon elles décalent silencieusement
                // le pointillé "entre plats" d'un cran, qui semble alors apparaître avant le 1er plat visible.
                const slotList = slotEntries(slot).filter((e) => e.dish_id || e.is_restaurant);
                const balance = showBalanceHint ? slotBalance(slot) : null;
                return (
                  <Card>
                    <View style={styles.slotHeader}>
                      <Text style={[styles.slotLabel, { color: colors.inkFaint }]}>{slotIcon(slot)} {label('meal_slot', slot)}</Text>
                      {activeSlots.length > 1 ? (
                        <Pressable onPress={() => setSlotActive(slot, false)} hitSlop={8}>
                          <Text style={{ color: colors.inkFaint, fontSize: 10 }}>✕ Retirer</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {slotList.length === 0 ? (
                      <Text style={{ color: colors.inkFaint, fontStyle: 'italic', fontSize: 12, marginBottom: 7, fontFamily: fonts.body }}>
                        Aucun plat prévu
                      </Text>
                    ) : (
                      <>
                        {slotList.map((entry, idx) => (
                          <View
                            key={entry.id}
                            style={idx > 0 ? { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line } : undefined}
                          >
                            {entry.is_restaurant ? (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 13.5, fontFamily: fonts.bodyMedium, color: colors.ink, fontStyle: 'italic' }}>🍽️ Au restaurant</Text>
                                <Pressable
                                  onPress={() => onRemove(entry.id)}
                                  hitSlop={8}
                                  style={[styles.removeBtn, { backgroundColor: colors.cream, borderColor: colors.beige }]}
                                >
                                  <Text style={{ color: colors.inkFaint, fontSize: 10 }}>✕</Text>
                                </Pressable>
                              </View>
                            ) : entry.dish ? (
                              <View>
                                <Text style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                                  {label('course_type', entry.dish.course_type)}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Pressable onPress={() => onSeeRecipe(entry.dish!.id, entry.id)} style={{ flex: 1, flexShrink: 1 }}>
                                    <Text style={[styles.dishName, { color: colors.ink, marginBottom: 0 }]} numberOfLines={1}>{entry.dish.name}</Text>
                                  </Pressable>
                                  <Text style={{ fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.bodyMedium, marginLeft: 8 }}>
                                    {entry.servings} pers.
                                  </Text>
                                  <Pressable
                                    onPress={() => onRemove(entry.id)}
                                    hitSlop={8}
                                    style={[styles.removeBtn, { backgroundColor: colors.cream, borderColor: colors.beige, marginLeft: 8 }]}
                                  >
                                    <Text style={{ color: colors.inkFaint, fontSize: 10 }}>✕</Text>
                                  </Pressable>
                                </View>
                                {entry.dish.calories != null || entry.dish.prep_minutes != null ? (
                                  <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 2 }}>
                                    {[
                                      entry.dish.calories != null ? `🔥 ${entry.dish.calories} kcal` : null,
                                      entry.dish.prep_minutes != null ? `⏱️ ${entry.dish.prep_minutes} min` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        ))}
                        {balance ? (
                          <Text style={{ fontSize: 10, color: balance.balanced ? colors.forest : colors.inkFaint, fontFamily: fonts.bodyMedium, marginTop: 8, marginBottom: 4 }}>
                            {balance.balanced ? '✅ Équilibré' : `⚠️ Il manque : ${balance.missing.map((t) => label('course_type', t)).join(', ')}`}
                          </Text>
                        ) : null}
                      </>
                    )}
                    <View
                      style={[
                        { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
                        slotList.length === 0
                          ? { marginTop: 0 }
                          : { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line },
                      ]}
                    >
                      <MiniButton label="+ Ajouter un plat" variant="sage" onPress={() => onAdd(slot)} />
                    </View>
                  </Card>
                );
              }}
            />
            </PullToRefresh>
          )}
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 2, marginBottom: 12 }}>
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ArrowBtn dir="prev" onPress={goPrevWeek} />
              <Pressable onLongPress={() => setWeekMenuOpen(true)}>
                <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>{formatWeekOf(weekStart)}</Text>
              </Pressable>
              <ArrowBtn dir="next" onPress={goNextWeek} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {toIso(weekStart) !== toIso(startOfWeek(new Date())) ? (
                <InfoPressable
                  onPress={goToday}
                  info={{ title: "Revenir à aujourd'hui", text: "Remet le planning sur la semaine du jour." }}
                  style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, borderColor: colors.beige }}
                >
                  <Text style={{ fontSize: 11 }}>⟲</Text>
                </InfoPressable>
              ) : null}
            </View>
          </View>

          {loading ? (
            <LoadingBlock />
          ) : (
            <ScrollView
              ref={weekScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              directionalLockEnabled
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: CARD_GAP }}
              style={Platform.OS === 'web' ? ({ cursor: 'grab' } as any) : undefined}
              {...webDragHandlers}
            >
              {days.map((d) => {
                const iso = toIso(d);
                const today = isToday(d);
                return (
                  <View key={iso} style={{ width: columnWidth }}>
                    <Pressable onPress={() => goToDate(iso)} onLongPress={() => openDayMenu(iso)} style={[styles.dayColHeader, { backgroundColor: today ? colors.forest : colors.paper, borderColor: today ? colors.forest : colors.beige }]}>
                      <Text style={{ fontSize: 8.5, fontFamily: fonts.bodySemiBold, textTransform: 'uppercase', color: today ? colors.paper : colors.inkFaint }}>{dayLabel(d)}</Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.bodySemiBold, color: today ? colors.paper : colors.ink }}>{d.getDate()}</Text>
                    </Pressable>

                    {allSlotKeys.filter((s) => activeSlots.includes(s)).map((slot) => {
                      const slotList = entries.filter((e) => e.date === iso && e.slot === slot);
                      return (
                        <View key={slot} style={[styles.dayColSlot, { borderColor: colors.line, backgroundColor: colors.paper }]}>
                          <Text style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.inkFaint, fontFamily: fonts.bodySemiBold, marginBottom: 4 }}>
                            {slotIcon(slot)} {label('meal_slot', slot)}
                          </Text>
                          {slotList.length === 0 ? (
                            <Pressable onPress={() => onAddFor(iso, slot)}>
                              <Text style={{ fontSize: 10, color: colors.honey, fontFamily: fonts.bodyMedium }}>+ New</Text>
                            </Pressable>
                          ) : (
                            <>
                              {slotList.map((entry) => (
                                <View key={entry.id} style={{ marginBottom: 4 }}>
                                  {entry.is_restaurant ? (
                                    <Text style={{ fontSize: 10.5, fontStyle: 'italic', color: colors.ink }} numberOfLines={1}>🍽️ Au resto</Text>
                                  ) : entry.dish ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Checkbox checked={entry.is_cooked} onPress={() => onToggleCooked(entry.id, !entry.is_cooked)} />
                                      <Text
                                        style={{ flex: 1, fontSize: 10.5, color: colors.ink, fontFamily: fonts.bodyMedium, textDecorationLine: entry.is_cooked ? 'line-through' : 'none' }}
                                        numberOfLines={1}
                                      >
                                        {entry.dish.name}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              ))}
                              <Pressable onPress={() => onAddFor(iso, slot)}>
                                <Text style={{ fontSize: 9.5, color: colors.honey, fontFamily: fonts.bodyMedium }}>+ New</Text>
                              </Pressable>
                            </>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </>
      )}

      <CalendarPicker
        visible={calendarOpen}
        selectedDate={selectedDate}
        onClose={() => setCalendarOpen(false)}
        onSelect={(iso) => goToDate(iso)}
      />

      <ActionSheet
        visible={!!dayMenuFor}
        title={dayMenuFor ? formatDayCaption(new Date(dayMenuFor)) : undefined}
        actions={dayMenuActions()}
        onClose={() => setDayMenuFor(null)}
      />

      <ActionSheet
        visible={weekMenuOpen}
        title={formatWeekOf(weekStart)}
        actions={weekMenuActions()}
        onClose={() => setWeekMenuOpen(false)}
      />

      <ActionSheet
        visible={!!conflictAction}
        title={conflictAction?.label}
        actions={
          conflictAction
            ? [
                { label: '🔁 Remplacer', onPress: () => conflictAction.run('replace') },
                { label: '➕ Ajouter aux repas existants', onPress: () => conflictAction.run('add') },
              ]
            : []
        }
        onClose={() => setConflictAction(null)}
      />

      <ActionSheet
        visible={addSlotMenuOpen}
        title="Activer un repas"
        actions={inactiveSlots.map((m) => ({
          label: `${m.icon ?? ''} ${m.label}`.trim(),
          onPress: () => setSlotActive(m.key, true),
        }))}
        onClose={() => setAddSlotMenuOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  title: { fontSize: 19, fontFamily: fonts.display },
  iconBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  switchWrap: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 10, borderRadius: radii.sm, padding: 3, gap: 2 },
  switchOpt: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 6 },
  stripWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18 },
  weekStrip: { flex: 1, flexDirection: 'row', gap: 4 },
  arrowBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayChip: { flex: 1, minWidth: 30, paddingVertical: 13, paddingHorizontal: 2, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  slotLabel: { fontSize: 9.5, fontFamily: fonts.bodySemiBold, letterSpacing: 0.6, textTransform: 'uppercase' },
  removeBtn: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dishName: { fontSize: 13.5, fontFamily: fonts.bodyMedium, marginBottom: 7 },
  dayColHeader: { alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginBottom: 6 },
  dayColSlot: { borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 6 },
});
