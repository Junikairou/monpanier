import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { resetData, ResetOptions } from '../../../src/data/reset';

const CHOICES: { key: keyof ResetOptions; label: string; hint: string }[] = [
  { key: 'plats', label: 'Mes plats', hint: 'Supprime tes recettes (celles que tu as créées)' },
  { key: 'planning', label: 'Planning', hint: 'Vide tous les repas planifiés du foyer' },
  { key: 'courses', label: 'Courses', hint: 'Vide la liste de courses et les cases cochées du foyer' },
  { key: 'modele', label: 'Modèle par défaut', hint: 'Vide le planning type du foyer' },
  { key: 'preferences', label: 'Préférences', hint: 'Remet le foyer, les repas actifs, les unités et la langue par défaut' },
];

export default function Reinitialiser() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;

  const [selected, setSelected] = useState<Set<keyof ResetOptions>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (key: keyof ResetOptions) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(CHOICES.map((c) => c.key)));

  const confirmAndReset = () => {
    if (selected.size === 0) return;
    const labels = CHOICES.filter((c) => selected.has(c.key)).map((c) => c.label).join(', ');
    const run = async () => {
      setBusy(true);
      try {
        const options: ResetOptions = {
          plats: selected.has('plats'),
          planning: selected.has('planning'),
          courses: selected.has('courses'),
          modele: selected.has('modele'),
          preferences: selected.has('preferences'),
        };
        await resetData(userId, options);
        router.back();
      } finally {
        setBusy(false);
      }
    };
    const message = `Cette action est définitive : ${labels}.`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Réinitialiser ?\n${message}`)) run();
      return;
    }
    Alert.alert('Réinitialiser ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="Réinitialiser des données" subtitle="Choisis ce qui doit être effacé" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {CHOICES.map((c) => {
          const active = selected.has(c.key);
          return (
            <Pressable
              key={c.key}
              onPress={() => toggle(c.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: colors.line,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: active ? colors.forest : colors.beigeDark,
                  backgroundColor: active ? colors.forest : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active ? <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, color: colors.ink }}>{c.label}</Text>
                <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>{c.hint}</Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable onPress={selectAll} style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: colors.forest, fontFamily: 'DMSans_500Medium' }}>Tout sélectionner</Text>
        </Pressable>

        <View style={{ marginTop: 24 }}>
          <Pill
            label={busy ? 'Réinitialisation…' : 'Réinitialiser la sélection'}
            variant="primary"
            disabled={busy || selected.size === 0}
            onPress={confirmAndReset}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
