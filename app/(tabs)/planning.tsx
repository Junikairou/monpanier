import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card, LoadingBlock, MiniButton, Screen } from '../../src/components/ui';
import { CalendarPicker } from '../../src/components/CalendarPicker';
import { addDays, dayLabel, formatDayCaption, formatWeekOf, isToday, startOfWeek, toIso } from '../../src/lib/dates';
import { listPlanningRange, removeMeal, setRestaurantMeal } from '../../src/data/planning';
import { getProfile } from '../../src/data/profile';
import { COURSE_TYPE_LABELS, CourseType, MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, MealSlot, PlanningEntry } from '../../src/types/models';
import { fonts, radii } from '../../src/theme/tokens';

const MEAL_SLOT_EMOJI: Record<MealSlot, string> = {
  petit_dej: '🍳',
  dejeuner: '🌞',
  gouter: '🍪',
  diner: '🌙',
  collation: '🌰',
};

function ArrowBtn({ dir, onPress }: { dir: 'prev' | 'next'; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.arrowBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}>
      <Text style={{ color: colors.inkSoft, fontSize: 11 }}>{dir === 'prev' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

export default function Planning() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toIso(new Date()));
  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlots, setActiveSlots] = useState<MealSlot[]>([...MEAL_SLOT_ORDER]);
  const [showBalanceHint, setShowBalanceHint] = useState(true);
  const [viewMode, setViewMode] = useState<'jour' | 'semaine'>('jour');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, profile] = await Promise.all([
        listPlanningRange(userId, toIso(weekStart), toIso(addDays(weekStart, 6))),
        getProfile(userId),
      ]);
      setEntries(data);
      setActiveSlots(profile.active_slots?.length ? profile.active_slots : [...MEAL_SLOT_ORDER]);
      setShowBalanceHint(profile.show_balance_hint);
    } finally {
      setLoading(false);
    }
  }, [userId, weekStart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedDateObj = days.find((d) => toIso(d) === selectedDate) ?? new Date(selectedDate);

  const slotEntries = (slot: MealSlot) =>
    entries.filter((e) => e.date === selectedDate && e.slot === slot);

  const dayEntries = entries.filter((e) => e.date === selectedDate && e.dish_id);
  const totalCalories = dayEntries.reduce((sum, e) => sum + (e.dish?.calories ?? 0), 0);
  const hasCalorieData = dayEntries.some((e) => e.dish?.calories != null);

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

  const onChange = (slot: MealSlot, entryId: string) => {
    router.push({ pathname: '/choisir-plat', params: { date: selectedDate, slot, entryId } });
  };

  const onRemove = async (entryId: string) => {
    await removeMeal(userId, entryId);
    load();
  };

  const onMarkResto = async (slot: MealSlot) => {
    await setRestaurantMeal(userId, selectedDate, slot);
    load();
  };

  const onSeeRecipe = (dishId: string) => {
    router.push({ pathname: '/(tabs)/plats/[id]', params: { id: dishId } });
  };

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

  return (
    <Screen>
      <View style={[styles.header, { backgroundColor: colors.cream, borderColor: colors.line }]}>
        <View>
          <Text style={[styles.title, { color: colors.ink }]}>Ma semaine</Text>
          <Text style={{ fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.body, marginTop: 2 }}>
            {formatWeekOf(weekStart)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={goToday}
            style={[styles.iconBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}
          >
            <Text style={{ fontSize: 13 }}>⟲</Text>
          </Pressable>
          <Pressable
            onPress={() => setCalendarOpen(true)}
            style={[styles.iconBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}
          >
            <Text style={{ fontSize: 13 }}>📅</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/courses')}
            style={[styles.iconBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}
          >
            <Text style={{ fontSize: 13 }}>🛒</Text>
          </Pressable>
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
                    onPress={() => setSelectedDate(iso)}
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

          <Text style={{ textAlign: 'center', fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.bodyMedium, marginTop: 2, marginBottom: 2 }}>
            {formatDayCaption(selectedDateObj)}
          </Text>

          {hasCalorieData ? (
            <Text style={{ textAlign: 'center', fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.bodyMedium, marginBottom: 8 }}>
              🔥 {totalCalories} kcal sur la journée
            </Text>
          ) : null}

          {loading ? (
            <LoadingBlock />
          ) : (
            <FlatList
              data={MEAL_SLOT_ORDER.filter((s) => activeSlots.includes(s))}
              keyExtractor={(s) => s}
              contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10 }}
              renderItem={({ item: slot }) => {
                const slotList = slotEntries(slot);
                const balance = showBalanceHint ? slotBalance(slot) : null;
                return (
                  <Card style={slotList.length === 0 ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.beigeDark, shadowOpacity: 0 } : undefined}>
                    <View style={styles.slotHeader}>
                      <Text style={[styles.slotLabel, { color: colors.inkFaint }]}>{MEAL_SLOT_EMOJI[slot]} {MEAL_SLOT_LABELS[slot]}</Text>
                    </View>
                    {slotList.length === 0 ? (
                      <>
                        <Text style={{ color: colors.inkFaint, fontStyle: 'italic', fontSize: 12, marginBottom: 7, fontFamily: fonts.body }}>
                          Aucun plat prévu
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                          <MiniButton label="+ Planifier un plat" variant="sage" onPress={() => onAdd(slot)} />
                          <MiniButton label="🍽️ Au resto" variant="outline" onPress={() => onMarkResto(slot)} />
                        </View>
                      </>
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
                              <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                                      {COURSE_TYPE_LABELS[entry.dish.course_type]}
                                    </Text>
                                    <Text style={[styles.dishName, { color: colors.ink, marginBottom: 2 }]}>{entry.dish.name}</Text>
                                    {entry.dish.calories != null ? (
                                      <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginBottom: 5 }}>🔥 {entry.dish.calories} kcal</Text>
                                    ) : null}
                                  </View>
                                  <Pressable
                                    onPress={() => onRemove(entry.id)}
                                    hitSlop={8}
                                    style={[styles.removeBtn, { backgroundColor: colors.cream, borderColor: colors.beige }]}
                                  >
                                    <Text style={{ color: colors.inkFaint, fontSize: 10 }}>✕</Text>
                                  </Pressable>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 5 }}>
                                  <MiniButton label="📖 Voir recette" variant="sage" onPress={() => onSeeRecipe(entry.dish!.id)} />
                                  <MiniButton label="🔄 Changer" variant="outline" onPress={() => onChange(slot, entry.id)} />
                                </View>
                              </>
                            ) : null}
                          </View>
                        ))}
                        {balance ? (
                          <Text style={{ fontSize: 10, color: balance.balanced ? colors.forest : colors.inkFaint, fontFamily: fonts.bodyMedium, marginBottom: 8 }}>
                            {balance.balanced ? '✅ Équilibré' : `⚠️ Il manque : ${balance.missing.map((t) => COURSE_TYPE_LABELS[t]).join(', ')}`}
                          </Text>
                        ) : null}
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                          <MiniButton label="+ Ajouter un autre plat" variant="outline" onPress={() => onAdd(slot)} />
                          <MiniButton label="🍽️ Au resto" variant="outline" onPress={() => onMarkResto(slot)} />
                        </View>
                      </>
                    )}
                  </Card>
                );
              }}
            />
          )}
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 30 }} />
            {days.map((d) => {
              const today = isToday(d);
              return (
                <Pressable key={toIso(d)} style={{ flex: 1, alignItems: 'center' }} onPress={() => goToDate(toIso(d))}>
                  <Text style={{ fontSize: 8, textTransform: 'uppercase', color: colors.inkFaint, fontFamily: fonts.bodySemiBold }}>{dayLabel(d)}</Text>
                  <Text style={{ fontSize: 12.5, fontFamily: fonts.bodySemiBold, color: today ? colors.forest : colors.ink }}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
          {MEAL_SLOT_ORDER.filter((s) => activeSlots.includes(s)).map((slot) => (
            <View key={slot} style={{ flexDirection: 'row', alignItems: 'stretch', marginTop: 6 }}>
              <View style={{ width: 30, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 }}>{MEAL_SLOT_EMOJI[slot]}</Text>
              </View>
              {days.map((d) => {
                const iso = toIso(d);
                const cellEntries = entries.filter((e) => e.date === iso && e.slot === slot);
                return (
                  <Pressable
                    key={iso}
                    onPress={() => goToDate(iso)}
                    style={[styles.weekCell, { borderColor: colors.line, backgroundColor: colors.paper }]}
                  >
                    {cellEntries.length === 0 ? (
                      <Text style={{ fontSize: 11, color: colors.inkFaint }}>·</Text>
                    ) : cellEntries.some((e) => e.is_restaurant) ? (
                      <Text style={{ fontSize: 13 }}>🍽️</Text>
                    ) : (
                      <>
                        <Text numberOfLines={1} style={{ fontSize: 8, color: colors.ink, fontFamily: fonts.bodyMedium }}>
                          {cellEntries[0].dish?.name}
                        </Text>
                        {cellEntries.length > 1 ? (
                          <Text style={{ fontSize: 7.5, color: colors.inkFaint }}>+{cellEntries.length - 1}</Text>
                        ) : null}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <CalendarPicker
        visible={calendarOpen}
        selectedDate={selectedDate}
        onClose={() => setCalendarOpen(false)}
        onSelect={(iso) => goToDate(iso)}
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
  weekCell: { flex: 1, aspectRatio: 1, marginHorizontal: 1, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
});
