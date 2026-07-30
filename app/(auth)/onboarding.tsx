import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Pill, Screen } from '../../src/components/ui';
import { getProfile, updateProfile } from '../../src/data/profile';
import { MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, MealSlot } from '../../src/types/models';

export default function Onboarding() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();

  const [householdSize, setHouseholdSize] = useState(1);
  const [activeSlots, setActiveSlots] = useState<MealSlot[]>([...MEAL_SLOT_ORDER]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getProfile(session.user.id)
      .then((p) => {
        setHouseholdSize(p.household_size ?? 1);
        setActiveSlots(p.active_slots?.length ? p.active_slots : [...MEAL_SLOT_ORDER]);
      })
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  const toggleSlot = (slot: MealSlot) => {
    setActiveSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(session.user.id, {
        household_size: householdSize,
        active_slots: activeSlots.length ? activeSlots : [...MEAL_SLOT_ORDER],
        onboarded: true,
      });
      router.replace('/(tabs)/planning');
    } catch (e: any) {
      setError(
        e?.message?.includes('column')
          ? "La base de données n'est pas à jour (migration manquante). Contacte le développeur."
          : "Une erreur est survenue, réessaie.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen><View /></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={[styles.title, { color: colors.ink }]}>Encore deux questions</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Pour adapter les portions et le planning à tes besoins
        </Text>

        <Text style={[styles.section, { color: colors.ink }]}>Combien de personnes dans le foyer ?</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => setHouseholdSize((n) => Math.max(1, n - 1))} style={[styles.stepBtn, { borderColor: colors.line }]}>
            <Text style={{ fontSize: 20, color: colors.forest }}>–</Text>
          </Pressable>
          <Text style={{ fontSize: 22, fontStyle: 'italic', color: colors.ink, minWidth: 36, textAlign: 'center' }}>{householdSize}</Text>
          <Pressable onPress={() => setHouseholdSize((n) => n + 1)} style={[styles.stepBtn, { borderColor: colors.line }]}>
            <Text style={{ fontSize: 20, color: colors.forest }}>+</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: colors.ink, marginTop: 26 }]}>Quels repas veux-tu planifier ?</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft, marginBottom: 12 }]}>
          Décoche ceux que tu ne prends pas — tu pourras changer ça plus tard dans ton profil
        </Text>
        {MEAL_SLOT_ORDER.map((slot) => {
          const active = activeSlots.includes(slot);
          return (
            <Pressable
              key={slot}
              onPress={() => toggleSlot(slot)}
              style={[styles.slotRow, { borderColor: colors.line, backgroundColor: active ? colors.sagePale : 'transparent' }]}
            >
              <Text style={{ fontSize: 14, color: colors.ink }}>{MEAL_SLOT_LABELS[slot]}</Text>
              <View style={[styles.check, { borderColor: active ? colors.forest : colors.line, backgroundColor: active ? colors.forest : 'transparent' }]}>
                {active ? <Text style={{ color: colors.paper, fontSize: 12 }}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}

        {error ? <Text style={{ color: colors.danger, fontSize: 12.5, textAlign: 'center', marginTop: 14 }}>{error}</Text> : null}

        <View style={{ marginTop: 26 }}>
          <Pill label={saving ? 'Enregistrement…' : "C'est parti"} variant="primary" onPress={finish} disabled={saving} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 28, paddingTop: 70 },
  title: { fontSize: 24, fontStyle: 'italic', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  section: { fontSize: 15, fontWeight: '600', marginTop: 10, marginBottom: 12, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderWidth: 1, borderRadius: 14, marginBottom: 8 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
