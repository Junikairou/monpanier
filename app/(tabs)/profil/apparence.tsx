import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme, TextScale } from '../../../src/theme/ThemeProvider';
import { LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile, updateProfile } from '../../../src/data/profile';

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

const TEXT_SCALES: { value: TextScale; label: string }[] = [
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Grand' },
  { value: 1.3, label: 'Très grand' },
];

export default function Apparence() {
  const { colors, preference, setPreference, textScale, setTextScale } = useTheme();
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
        <ScreenHeader title="Apparence" onBack={() => router.back()} />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Apparence" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <SectionLabel text="Thème" />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(['light', 'dark', 'auto', 'rose', 'bleu'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setPreference(t)}
              style={[
                styles.themeSwatch,
                {
                  borderColor: preference === t ? colors.forest : colors.line,
                  backgroundColor:
                    t === 'light' ? '#FAF7EF'
                    : t === 'dark' ? '#1C2019'
                    : t === 'rose' ? '#D98A9C'
                    : t === 'bleu' ? '#6FA0C7'
                    : colors.honey,
                },
              ]}
            >
              {t === 'auto' ? <Text style={{ fontSize: 10, color: colors.paper }}>A</Text> : null}
            </Pressable>
          ))}
        </View>

        <SectionLabel text="Langue" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {LANGUAGES.map((l) => (
            <Pill key={l.code} label={l.label} variant={profile.language === l.code ? 'primary' : 'default'} onPress={() => patch({ language: l.code })} />
          ))}
        </View>
        {profile.language !== 'fr' ? (
          <Text style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 20, fontStyle: 'italic' }}>
            Préférence enregistrée — la traduction complète de l'interface arrive dans une prochaine version.
          </Text>
        ) : (
          <View style={{ marginBottom: 20 }} />
        )}

        <SectionLabel text="Taille du texte" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {TEXT_SCALES.map((t) => (
            <Pill key={t.value} label={t.label} variant={textScale === t.value ? 'primary' : 'default'} onPress={() => setTextScale(t.value)} />
          ))}
        </View>

        <SectionLabel text="Unités" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pill label="Métrique (g, ml)" variant={profile.units === 'metric' ? 'primary' : 'default'} onPress={() => patch({ units: 'metric' })} />
          <Pill label="Impérial (oz, cup)" variant={profile.units === 'imperial' ? 'primary' : 'default'} onPress={() => patch({ units: 'imperial' })} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.section, { color: colors.inkSoft }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  section: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  themeSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
