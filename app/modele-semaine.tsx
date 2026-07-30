import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card, LoadingBlock, MiniButton, Screen, ScreenHeader } from '../src/components/ui';
import { getProfile } from '../src/data/profile';
import { clearTemplate, listTemplate, removeTemplateEntry, setTemplateRestaurant } from '../src/data/template';
import { COURSE_TYPE_LABELS, MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, MealSlot, TemplateEntry } from '../src/types/models';
import { fonts } from '../src/theme/tokens';

const WEEKDAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_SLOT_EMOJI: Record<MealSlot, string> = {
  petit_dej: '🍳',
  dejeuner: '🌞',
  gouter: '🍪',
  diner: '🌙',
  collation: '🌰',
};

export default function ModeleSemaine() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;

  const [entries, setEntries] = useState<TemplateEntry[]>([]);
  const [activeSlots, setActiveSlots] = useState<MealSlot[]>([...MEAL_SLOT_ORDER]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, profile] = await Promise.all([listTemplate(userId), getProfile(userId)]);
      setEntries(data);
      setActiveSlots(profile.active_slots?.length ? profile.active_slots : [...MEAL_SLOT_ORDER]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onAdd = (weekday: number, slot: MealSlot) => {
    router.push({ pathname: '/choisir-plat', params: { mode: 'template', weekday: String(weekday), slot } });
  };

  const onChange = (weekday: number, slot: MealSlot, entryId: string) => {
    router.push({ pathname: '/choisir-plat', params: { mode: 'template', weekday: String(weekday), slot, entryId } });
  };

  const onResto = async (weekday: number, slot: MealSlot) => {
    await setTemplateRestaurant(userId, weekday, slot);
    load();
  };

  const onRemove = async (entryId: string) => {
    await removeTemplateEntry(entryId);
    load();
  };

  const onClear = async () => {
    await clearTemplate(userId);
    load();
  };

  return (
    <Screen>
      <ScreenHeader title="Planning par défaut" subtitle="Modèle appliqué à la demande sur une semaine" />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={Array.from({ length: 7 }, (_, i) => i)}
          keyExtractor={(w) => String(w)}
          contentContainerStyle={{ padding: 18, gap: 12 }}
          ListFooterComponent={
            entries.length > 0 ? (
              <Pressable onPress={onClear} style={{ alignSelf: 'center', marginTop: 4, paddingVertical: 8, paddingHorizontal: 14 }}>
                <Text style={{ color: colors.inkFaint, fontSize: 12, fontFamily: fonts.bodyMedium }}>🗑️ Vider le modèle</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item: weekday }) => {
            const daySlots = MEAL_SLOT_ORDER.filter((s) => activeSlots.includes(s));
            return (
              <Card>
                <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink, marginBottom: 8 }}>
                  {WEEKDAY_NAMES[weekday]}
                </Text>
                {daySlots.map((slot) => {
                  const list = entries.filter((e) => e.weekday === weekday && e.slot === slot);
                  return (
                    <View key={slot} style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 9.5, fontFamily: fonts.bodySemiBold, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.inkFaint, marginBottom: 3 }}>
                        {MEAL_SLOT_EMOJI[slot]} {MEAL_SLOT_LABELS[slot]}
                      </Text>
                      {list.length === 0 ? (
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                          <MiniButton label="+ Ajouter" variant="sage" onPress={() => onAdd(weekday, slot)} />
                          <MiniButton label="🍽️ Au resto" variant="outline" onPress={() => onResto(weekday, slot)} />
                        </View>
                      ) : (
                        <>
                          {list.map((entry) => (
                            <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              {entry.is_restaurant ? (
                                <Text style={{ fontSize: 12.5, fontStyle: 'italic', color: colors.ink }}>🍽️ Au restaurant</Text>
                              ) : (
                                <Pressable onPress={() => onChange(weekday, slot, entry.id)} style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12.5, fontFamily: fonts.bodyMedium, color: colors.ink }}>
                                    {entry.dish ? entry.dish.name : '…'}
                                    {entry.dish ? ` (${COURSE_TYPE_LABELS[entry.dish.course_type]})` : ''}
                                  </Text>
                                </Pressable>
                              )}
                              <Pressable
                                onPress={() => onRemove(entry.id)}
                                hitSlop={8}
                                style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, borderColor: colors.beige }}
                              >
                                <Text style={{ color: colors.inkFaint, fontSize: 10 }}>✕</Text>
                              </Pressable>
                            </View>
                          ))}
                          <MiniButton label="+ Ajouter un autre plat" variant="outline" onPress={() => onAdd(weekday, slot)} />
                        </>
                      )}
                    </View>
                  );
                })}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
