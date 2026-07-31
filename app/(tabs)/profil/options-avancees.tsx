import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile, updateProfile } from '../../../src/data/profile';
import { MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, MealSlot } from '../../../src/types/models';

export default function OptionsAvancees() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProfile(userId).then(setProfile);
    }, [userId]),
  );

  const patch = async (p: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...p } : prev));
    await updateProfile(userId, p);
  };

  if (!profile) {
    return (
      <Screen>
        <ScreenHeader title="Options avancées" onBack={() => router.back()} />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Options avancées" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={[styles.section, { color: colors.inkSoft }]}>Planning</Text>
        <View style={[styles.row, { borderColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, color: colors.ink }}>Indicateur repas équilibré</Text>
            <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>
              Avertit quand un repas n'a pas d'accompagnement/fruit
            </Text>
          </View>
          <Switch
            value={profile.show_balance_hint}
            onValueChange={(v) => patch({ show_balance_hint: v })}
            trackColor={{ true: colors.forest }}
          />
        </View>

        <Text style={[styles.section, { color: colors.inkSoft, marginTop: 20 }]}>Recettes</Text>
        <View style={[styles.row, { borderColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, color: colors.ink }}>Calories et nutriments</Text>
            <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>
              Affiche ces champs (optionnels) dans le formulaire de plat
            </Text>
          </View>
          <Switch
            value={profile.show_nutrition_fields}
            onValueChange={(v) => patch({ show_nutrition_fields: v })}
            trackColor={{ true: colors.forest }}
          />
        </View>

        <Text style={[styles.section, { color: colors.inkSoft, marginTop: 20 }]}>Repas à planifier</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MEAL_SLOT_ORDER.map((slot: MealSlot) => {
            const active = profile.active_slots?.includes(slot);
            return (
              <Pill
                key={slot}
                label={MEAL_SLOT_LABELS[slot]}
                variant={active ? 'primary' : 'default'}
                onPress={() => {
                  const next = active
                    ? profile.active_slots.filter((s) => s !== slot)
                    : [...(profile.active_slots ?? []), slot];
                  patch({ active_slots: next.length ? next : [slot] });
                }}
              />
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
});
