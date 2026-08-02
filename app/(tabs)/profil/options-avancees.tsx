import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { LoadingBlock, Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile, updateProfile } from '../../../src/data/profile';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import {
  getMealTimes,
  getNotificationsEnabled,
  MealTimes,
  notificationsSupported,
  requestNotificationPermission,
  setMealTime,
  setNotificationsEnabled,
} from '../../../src/lib/notifications';

export default function OptionsAvancees() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { mealSlots } = useTaxonomies();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [mealTimes, setMealTimesState] = useState<MealTimes>({});

  useFocusEffect(
    useCallback(() => {
      getProfile(userId).then(setProfile);
    }, [userId]),
  );

  useEffect(() => {
    getNotificationsEnabled().then(setNotifEnabled);
    getMealTimes().then(setMealTimesState);
  }, []);

  const toggleNotifications = async (v: boolean) => {
    if (v) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setNotifEnabled(v);
    await setNotificationsEnabled(v);
  };

  const changeMealTime = async (slotKey: string, time: string) => {
    setMealTimesState((prev) => ({ ...prev, [slotKey]: time }));
    await setMealTime(slotKey, time || null);
  };

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

        <Text style={[styles.section, { color: colors.inkSoft, marginTop: 20 }]}>Notifications</Text>
        {!notificationsSupported() ? (
          <Text style={{ fontSize: 11.5, color: colors.inkFaint, marginBottom: 6 }}>
            Non disponible sur cet appareil/navigateur.
          </Text>
        ) : (
          <>
            <View style={[styles.row, { borderColor: colors.line }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, color: colors.ink }}>Rappel de préparation</Text>
                <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>
                  Prévient quand commencer à cuisiner, selon l'heure du repas et le temps de préparation. Fonctionne
                  seulement si l'app reste ouverte dans un onglet.
                </Text>
              </View>
              <Switch value={notifEnabled} onValueChange={toggleNotifications} trackColor={{ true: colors.forest }} />
            </View>
            {notifEnabled ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                {mealSlots.map((slot) => (
                  <View key={slot.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12.5, color: colors.ink }}>{slot.icon ? `${slot.icon} ` : ''}{slot.label}</Text>
                    <TextInput
                      value={mealTimes[slot.key] ?? ''}
                      onChangeText={(v) => changeMealTime(slot.key, v)}
                      placeholder="HH:mm"
                      placeholderTextColor={colors.inkFaint}
                      style={{
                        width: 74,
                        borderWidth: 1,
                        borderColor: colors.line,
                        borderRadius: 8,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        fontSize: 12.5,
                        color: colors.ink,
                        textAlign: 'center',
                      }}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
});
