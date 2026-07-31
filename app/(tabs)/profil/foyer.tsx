import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { LoadingBlock, Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile, updateProfile } from '../../../src/data/profile';

export default function Foyer() {
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
        <ScreenHeader title="Foyer" onBack={() => router.back()} />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Foyer" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={[styles.row, { borderColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, color: colors.ink }}>Personnes dans le foyer</Text>
            <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>Ajuste les portions par défaut</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => patch({ household_size: Math.max(1, profile.household_size - 1) })}>
              <Text style={{ color: colors.forest, fontSize: 18 }}>–</Text>
            </Pressable>
            <Text style={{ color: colors.ink, fontSize: 14, minWidth: 16, textAlign: 'center' }}>{profile.household_size}</Text>
            <Pressable onPress={() => patch({ household_size: profile.household_size + 1 })}>
              <Text style={{ color: colors.forest, fontSize: 18 }}>+</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
});
