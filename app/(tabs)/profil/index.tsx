import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile } from '../../../src/data/profile';
import { fonts } from '../../../src/theme/tokens';

interface TileDef {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const SECTIONS: { title: string; tiles: TileDef[] }[] = [
  {
    title: 'Préférences',
    tiles: [
      { label: 'Apparence', icon: 'color-palette-outline', route: '/(tabs)/profil/apparence' },
      { label: 'Options avancées', icon: 'options-outline', route: '/(tabs)/profil/options-avancees' },
    ],
  },
  {
    title: 'Social',
    tiles: [
      { label: 'Partage du foyer', icon: 'home-outline', route: '/(tabs)/profil/partage' },
      { label: 'Amis', icon: 'person-add-outline', route: '/(tabs)/profil/amis' },
    ],
  },
  {
    title: 'Gestion',
    tiles: [
      { label: 'Recettes', icon: 'restaurant-outline', route: '/(tabs)/profil/catalogue' },
      { label: 'Personnalisation', icon: 'pricetags-outline', route: '/personnalisation' },
    ],
  },
  {
    title: 'Avancé',
    tiles: [
      { label: 'Paramètres', icon: 'settings-outline', route: '/(tabs)/profil/parametres' },
      { label: 'Historique', icon: 'time-outline', route: '/(tabs)/profil/historique' },
      { label: 'Feedback', icon: 'chatbubble-ellipses-outline', route: '/(tabs)/profil/feedback' },
    ],
  },
];

function Tile({ tile }: { tile: TileDef }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Pressable style={styles.tile} onPress={() => router.push(tile.route as any)}>
      <View style={[styles.tileIcon, { backgroundColor: colors.paper, shadowColor: colors.ink }]}>
        <Ionicons name={tile.icon} size={22} color={colors.forestDark} />
      </View>
      <Text style={{ fontSize: 10.5, fontFamily: fonts.bodyMedium, color: colors.inkSoft, textAlign: 'center' }} numberOfLines={2}>
        {tile.label}
      </Text>
    </Pressable>
  );
}

export default function Profil() {
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

  const initial = (profile?.display_name || session!.user.email || '?').charAt(0).toUpperCase();

  return (
    <Screen>
      <ScreenHeader title="Plus" />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Pressable
          onPress={() => router.push('/(tabs)/profil/mon-profil')}
          style={[styles.profileRow, { backgroundColor: colors.paper, borderColor: colors.line }]}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
              <Text style={{ fontSize: 16, fontFamily: fonts.display, color: colors.forestDark }}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: colors.ink }}>
              {profile?.display_name || 'Mon profil'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.inkSoft }}>{session!.user.email}</Text>
          </View>
          <Text style={{ color: colors.inkSoft, fontSize: 16 }}>›</Text>
        </Pressable>

        {SECTIONS.map((section) => (
          <View key={section.title} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 13, fontFamily: fonts.bodySemiBold, color: colors.forestDark, marginBottom: 10 }}>
              {section.title}
            </Text>
            <View style={styles.grid}>
              {section.tiles.map((tile) => (
                <Tile key={tile.label} tile={tile} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  tile: { width: 74, alignItems: 'center', gap: 6 },
  tileIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
});
