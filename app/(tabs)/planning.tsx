import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card, LoadingBlock, MiniButton, Pill, Screen } from '../../src/components/ui';
import { addDays, dayLabel, formatDayCaption, formatWeekOf, startOfWeek, toIso } from '../../src/lib/dates';
import { listPlanningRange, removeMeal } from '../../src/data/planning';
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, profile] = await Promise.all([
        listPlanningRange(userId, toIso(weekStart), toIso(addDays(weekStart, 6))),
        getProfile(userId),
      ]);
      setEntries(data);
      setActiveSlots(profile.active_slots?.length ? profile.active_slots : [...MEAL_SLOT_ORDER]);
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
  const presentTypes = new Set(dayEntries.map((e) => e.dish?.course_type).filter(Boolean));
  const missingTypes = BALANCE_TYPES.filter((t) => !presentTypes.has(t));
  const isBalanced = dayEntries.length > 0 && missingTypes.length === 0;

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

  const onSeeRecipe = (dishId: string) => {
    router.push({ pathname: '/(tabs)/plats/[id]', params: { id: dishId } });
  };

  const goPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goNextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <Screen>
      <View style={[styles.header, { backgroundColor: colors.cream, borderColor: colors.line }]}>
        <View>
          <Text style={[styles.title, { color: colors.ink }]}>Ma semaine</Text>
          <Text style={{ fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.body, marginTop: 2 }}>
            {formatWeekOf(weekStart)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/courses')}
          style={[styles.iconBtn, { backgroundColor: colors.paper, borderColor: colors.beige }]}
        >
          <Text style={{ fontSize: 13 }}>🛒</Text>
        </Pressable>
      </View>

      <View style={styles.stripWrap}>
        <ArrowBtn dir="prev" onPress={goPrevWeek} />
        <View style={styles.weekStrip}>
          {days.map((d) => {
            const iso = toIso(d);
            const selected = iso === selectedDate;
            const hasMeal = entries.some((e) => e.date === iso && e.dish_id);
            return (
              <Pressable
                key={iso}
                onPress={() => setSelectedDate(iso)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: selected ? colors.forest : colors.paper,
                    borderColor: selected ? colors.forest : colors.beige,
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

      {dayEntries.length > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          {hasCalorieData ? (
            <Text style={{ fontSize: 10.5, color: colors.inkFaint, fontFamily: fonts.bodyMedium }}>🔥 {totalCalories} kcal</Text>
          ) : null}
          <Text style={{ fontSize: 10.5, color: isBalanced ? colors.forest : colors.inkFaint, fontFamily: fonts.bodyMedium }}>
            {isBalanced ? '✅ Repas équilibré' : `⚠️ Il manque : ${missingTypes.map((t) => COURSE_TYPE_LABELS[t]).join(', ')}`}
          </Text>
        </View>
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
                    <MiniButton label="+ Planifier un plat" variant="sage" onPress={() => onAdd(slot)} />
                  </>
                ) : (
                  <>
                    {slotList.map((entry, idx) => (
                      <View
                        key={entry.id}
                        style={idx > 0 ? { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line } : undefined}
                      >
                        {entry.dish ? (
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
                    <View style={{ marginTop: 10 }}>
                      <MiniButton label="+ Ajouter un autre plat" variant="outline" onPress={() => onAdd(slot)} />
                    </View>
                  </>
                )}
              </Card>
            );
          }}
        />
      )}
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
  stripWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18 },
  weekStrip: { flex: 1, flexDirection: 'row', gap: 4 },
  arrowBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayChip: { flex: 1, minWidth: 30, paddingVertical: 13, paddingHorizontal: 2, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  slotLabel: { fontSize: 9.5, fontFamily: fonts.bodySemiBold, letterSpacing: 0.6, textTransform: 'uppercase' },
  removeBtn: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dishName: { fontSize: 13.5, fontFamily: fonts.bodyMedium, marginBottom: 7 },
});
