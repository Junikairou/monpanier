import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../../src/components/ui';
import { addDays, dayLabel, formatWeekRange, isToday, startOfWeek, toIso } from '../../src/lib/dates';
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

  return (
    <Screen>
      <ScreenHeader title="Ma semaine" subtitle={formatWeekRange(weekStart)} />
      <View style={[styles.weekNav, { borderColor: colors.line }]}>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} hitSlop={10}>
          <Text style={{ color: colors.forest, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))}>
          <Text style={{ color: colors.inkSoft, fontSize: 11.5 }}>Aujourd'hui</Text>
        </Pressable>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} hitSlop={10}>
          <Text style={{ color: colors.forest, fontSize: 18 }}>Semaine suivante  ›</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
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
                  borderColor: selected ? colors.forest : colors.beigeDark,
                },
              ]}
            >
              <Text style={{ fontSize: 9.5, fontFamily: fonts.bodySemiBold, letterSpacing: 0.3, color: selected ? colors.paper : colors.inkFaint }}>{dayLabel(d)}</Text>
              <Text style={{ fontSize: 15, fontFamily: fonts.bodySemiBold, color: selected ? colors.paper : colors.ink, marginTop: 2 }}>
                {d.getDate()}
              </Text>
              {hasMeal ? (
                <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 3, backgroundColor: selected ? 'rgba(255,255,255,.7)' : colors.forest }} />
              ) : (
                <View style={{ width: 4, height: 4, marginTop: 3 }} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={MEAL_SLOT_ORDER.filter((s) => activeSlots.includes(s))}
          keyExtractor={(s) => s}
          contentContainerStyle={{ padding: 18, paddingTop: 14, gap: 12 }}
          renderItem={({ item: slot }) => {
            const entry = slotEntry(slot);
            return (
              <Card>
                <View style={styles.slotHeader}>
                  <Text style={[styles.slotLabel, { color: colors.inkFaint }]}>{MEAL_SLOT_EMOJI[slot]} {MEAL_SLOT_LABELS[slot]}</Text>
                  {entry ? (
                    <Pressable onPress={() => onChange(slot, entry.id)}>
                      <Text style={{ color: colors.honey, fontSize: 11.5, fontFamily: fonts.bodySemiBold }}>✎ modifier</Text>
                    </Pressable>
                  ) : null}
                </View>
                {entry?.dish ? (
                  <>
                    <Text style={[styles.dishName, { color: colors.ink }]}>{entry.dish.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pill label="Voir recette" onPress={() => onSeeRecipe(entry.dish!.id)} />
                      <Pill label="Changer le plat" variant="ghost" onPress={() => onChange(slot, entry.id)} />
                      <Pill label="Supprimer" variant="ghost" onPress={() => onRemove(entry.id)} />
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
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dayStrip: { flexGrow: 0, paddingVertical: 12 },
  dayChip: { width: 44, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  slotLabel: { fontSize: 10, fontFamily: fonts.bodySemiBold, letterSpacing: 0.6, textTransform: 'uppercase' },
  dishName: { fontSize: 15.5, fontFamily: fonts.bodySemiBold, marginBottom: 10 },
});
