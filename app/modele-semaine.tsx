import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Text } from '../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card, LoadingBlock, MiniButton, Screen, ScreenHeader } from '../src/components/ui';
import { getProfile } from '../src/data/profile';
import { clearTemplate, listTemplate, removeTemplateEntry } from '../src/data/template';
import { useTaxonomies } from '../src/lib/taxonomies';
import { MealSlot, TemplateEntry } from '../src/types/models';
import { fonts } from '../src/theme/tokens';

const WEEKDAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function ModeleSemaine() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { label, mealSlots } = useTaxonomies();
  const allSlotKeys = mealSlots.map((m) => m.key);
  const slotIcon = (key: MealSlot) => mealSlots.find((m) => m.key === key)?.icon ?? '';

  const [entries, setEntries] = useState<TemplateEntry[]>([]);
  const [activeSlots, setActiveSlots] = useState<MealSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, profile] = await Promise.all([listTemplate(userId), getProfile(userId)]);
      setEntries(data);
      setActiveSlots(profile.active_slots?.length ? profile.active_slots : allSlotKeys);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mealSlots]);

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
            const daySlots = allSlotKeys.filter((s) => activeSlots.includes(s));
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
                        {slotIcon(slot)} {label('meal_slot', slot)}
                      </Text>
                      {list.length === 0 ? (
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                          <MiniButton label="+ Ajouter" variant="sage" onPress={() => onAdd(weekday, slot)} />
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
                                    {entry.dish ? ` (${label('course_type', entry.dish.course_type)})` : ''}
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
