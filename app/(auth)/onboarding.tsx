import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ScaledText';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Pill, Screen } from '../../src/components/ui';
import { fonts } from '../../src/theme/tokens';
import { getProfile, updateProfile } from '../../src/data/profile';
import { useTaxonomies } from '../../src/lib/taxonomies';
import { MealSlot } from '../../src/types/models';

export default function Onboarding() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { mealSlots, label } = useTaxonomies();
  const allSlotKeys = mealSlots.map((m) => m.key);

  const [householdSize, setHouseholdSize] = useState(1);
  const [activeSlots, setActiveSlots] = useState<MealSlot[]>([]);
  const [mode, setMode] = useState<'complet' | 'simple'>('complet');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getProfile(session.user.id)
      .then((p) => {
        setHouseholdSize(p.household_size ?? 1);
        setActiveSlots(p.active_slots?.length ? p.active_slots : allSlotKeys);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  const toggleSlot = (slot: MealSlot) => {
    setActiveSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const chooseMode = (next: 'complet' | 'simple') => {
    setMode(next);
    if (next === 'complet') {
      setActiveSlots(allSlotKeys);
    } else {
      const preferred = allSlotKeys.filter((s) => s === 'dejeuner' || s === 'diner');
      setActiveSlots(preferred.length ? preferred : allSlotKeys.slice(0, 2));
    }
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(session.user.id, {
        household_size: householdSize,
        active_slots: activeSlots.length ? activeSlots : allSlotKeys,
        show_balance_hint: mode === 'complet',
        show_nutrition_fields: mode === 'complet',
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
        <Text style={[styles.title, { color: colors.ink }]}>Encore quelques questions</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Pour adapter les portions et le planning à tes besoins
        </Text>

        <Text style={[styles.section, { color: colors.ink }]}>Quel mode veux-tu ?</Text>
        <Pressable
          onPress={() => chooseMode('complet')}
          style={[styles.modeCard, { borderColor: mode === 'complet' ? colors.forest : colors.line, backgroundColor: mode === 'complet' ? colors.sagePale : 'transparent' }]}
        >
          <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: colors.ink }}>🌿 Mode Complet</Text>
          <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 3 }}>
            Toutes les options avancées activées (nutriments, indicateur d'équilibre, tous les repas). Tu peux tout désactiver ensuite si besoin.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => chooseMode('simple')}
          style={[styles.modeCard, { borderColor: mode === 'simple' ? colors.forest : colors.line, backgroundColor: mode === 'simple' ? colors.sagePale : 'transparent', marginBottom: 20 }]}
        >
          <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: colors.ink }}>🍃 Mode Simple</Text>
          <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 3 }}>
            Options avancées désactivées, juste déjeuner et dîner au planning. Le plus épuré pour démarrer — tu pourras tout activer plus tard.
          </Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.ink }]}>Combien de personnes dans le foyer ?</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => setHouseholdSize((n) => Math.max(1, n - 1))} style={[styles.stepBtn, { borderColor: colors.line }]}>
            <Text style={{ fontSize: 20, color: colors.forest }}>–</Text>
          </Pressable>
          <Text style={{ fontSize: 22, fontFamily: fonts.display, color: colors.ink, minWidth: 36, textAlign: 'center' }}>{householdSize}</Text>
          <Pressable onPress={() => setHouseholdSize((n) => n + 1)} style={[styles.stepBtn, { borderColor: colors.line }]}>
            <Text style={{ fontSize: 20, color: colors.forest }}>+</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: colors.ink, marginTop: 26 }]}>Quels repas veux-tu planifier ?</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft, marginBottom: 12 }]}>
          Décoche ceux que tu ne prends pas — tu pourras changer ça plus tard dans ton profil
        </Text>
        {mealSlots.map(({ key: slot }) => {
          const active = activeSlots.includes(slot);
          return (
            <Pressable
              key={slot}
              onPress={() => toggleSlot(slot)}
              style={[styles.slotRow, { borderColor: colors.line, backgroundColor: active ? colors.sagePale : 'transparent' }]}
            >
              <Text style={{ fontSize: 14, color: colors.ink }}>{label('meal_slot', slot)}</Text>
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
  title: { fontSize: 25, fontFamily: fonts.display, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  section: { fontSize: 15, fontFamily: fonts.bodySemiBold, marginTop: 10, marginBottom: 12, textAlign: 'center' },
  modeCard: { borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderWidth: 1, borderRadius: 14, marginBottom: 8 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
