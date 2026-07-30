import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card, LoadingBlock, Pill, Screen } from '../../src/components/ui';
import { addDays, dayLabel, formatDayCaption, formatWeekOf, startOfWeek, toIso } from '../../src/lib/dates';
import { listPlanningRange, removeMeal } from '../../src/data/planning';
import { getProfile } from '../../src/data/profile';
import { MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, MealSlot, PlanningEntry } from '../../src/types/models';
import { fonts } from '../../src/theme/tokens';

const MEAL_SLOT_EMOJI: Record<MealSlot, string> = {
  petit_dej: '🍳',
  dejeuner: '🌞',
  gouter: '🍪',
  diner: '🌙',
  collation: '🌰',
};

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

  const slotEntry = (slot: MealSlot) =>
    entries.find((e) => e.date === selectedDate && e.slot === slot);

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
          <Text style={{ fontSize: 11.5, color: colors.forestDark, fontFamily: fonts.bodyMedium, marginTop: 2 }}>
            {formatWeekOf(weekStart)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/courses')}
          style={[styles.iconBtn, { backgroundColor: colors.paper, borderColor: colors.beigeDark }]}
        >
          <Text style={{ fontSize: 15 }}>🛒</Text>
        </Pressable>
      </View>

      <View style={[styles.stripWrap, { backgroundColor: colors.paper, borderColor: colors.beigeDark }]}>
        <Pressable onPress={goPrevWeek} hitSlop={8} style={styles.stripArrow}>
          <Text style={{ color: colors.inkSoft, fontSize: 13 }}>‹</Text>
        </Pressable>
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
                { backgroundColor: selected ? colors.forest : 'transparent' },
              ]}
            >
              <Text style={{ fontSize: 9, fontFamily: fonts.bodySemiBold, color: selected ? colors.paper : colors.inkFaint }}>{dayLabel(d)}</Text>
              <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: selected ? colors.paper : colors.ink, marginTop: 1 }}>
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
        <Pressable onPress={goNextWeek} hitSlop={8} style={styles.stripArrow}>
          <Text style={{ color: colors.inkSoft, fontSize: 13 }}>›</Text>
        </Pressable>
      </View>

      <Text style={{ textAlign: 'center', fontSize: 11.5, color: colors.forestDark, fontFamily: fonts.bodyMedium, marginTop: 8, marginBottom: 4 }}>
        {formatDayCaption(selectedDateObj)}
      </Text>

      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={MEAL_SLOT_ORDER.filter((s) => activeSlots.includes(s))}
          keyExtractor={(s) => s}
          contentContainerStyle={{ padding: 18, paddingTop: 10, gap: 12 }}
          renderItem={({ item: slot }) => {
            const entry = slotEntry(slot);
            return (
              <Card>
                <View style={styles.slotHeader}>
                  <Text style={[styles.slotLabel, { color: colors.inkFaint }]}>{MEAL_SLOT_EMOJI[slot]} {MEAL_SLOT_LABELS[slot]}</Text>
                  {entry ? (
                    <Pressable
                      onPress={() => onRemove(entry.id)}
                      hitSlop={8}
                      style={[styles.removeBtn, { backgroundColor: colors.cream, borderColor: colors.beigeDark }]}
                    >
                      <Text style={{ color: colors.inkFaint, fontSize: 10 }}>✕</Text>
                    </Pressable>
                  ) : null}
                </View>
                {entry?.dish ? (
                  <>
                    <Text style={[styles.dishName, { color: colors.ink }]}>{entry.dish.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pill label="Voir recette" onPress={() => onSeeRecipe(entry.dish!.id)} />
                      <Pill label="Changer le plat" variant="ghost" onPress={() => onChange(slot, entry.id)} />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ color: colors.inkSoft, fontStyle: 'italic', fontSize: 12.5, marginBottom: 10 }}>
                      Aucun repas prévu
                    </Text>
                    <Pill label="+ Ajouter un repas" variant="primary" onPress={() => onAdd(slot)} />
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
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  title: { fontSize: 21, fontFamily: fonts.display },
  iconBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stripWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 12,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  stripArrow: { width: 20, alignItems: 'center' },
  dayChip: { flex: 1, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  slotLabel: { fontSize: 10, fontFamily: fonts.bodySemiBold, letterSpacing: 0.6, textTransform: 'uppercase' },
  removeBtn: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dishName: { fontSize: 15.5, fontFamily: fonts.bodySemiBold, marginBottom: 10 },
});
