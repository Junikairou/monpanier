import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { createHouseholdInvite, HouseholdMemberProfile, joinHouseholdWithCode, listHouseholdMemberProfiles } from '../../../src/data/household';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { getProfile, Profile, updateProfile } from '../../../src/data/profile';
import { fonts } from '../../../src/theme/tokens';

export default function PartageFoyer() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { reload: reloadTaxonomies } = useTaxonomies();

  const [members, setMembers] = useState<HouseholdMemberProfile[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);

  const load = useCallback(() => {
    listHouseholdMemberProfiles(userId).then(setMembers);
    getProfile(userId).then(setProfile);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const patch = async (p: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...p } : prev));
    await updateProfile(userId, p);
  };

  if (!members || !profile) {
    return (
      <Screen>
        <ScreenHeader title="Partage du foyer" onBack={() => router.back()} />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Partage du foyer" subtitle="Planning et courses communs" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={[styles.section, { color: colors.inkSoft }]}>Personnes dans le foyer</Text>
        <View style={[styles.memberRow, { borderColor: colors.line, marginBottom: 20, justifyContent: 'space-between' }]}>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>Ajuste les portions par défaut</Text>
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

        <Text style={[styles.section, { color: colors.inkSoft }]}>Membres du foyer</Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {members.map((m) => (
            <View key={m.id} style={[styles.memberRow, { borderColor: colors.line }]}>
              {m.avatar_url ? (
                <Image source={{ uri: m.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.display, color: colors.forestDark }}>
                    {(m.display_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 13, color: colors.ink }}>{m.display_name || 'Membre'}{m.id === userId ? ' (toi)' : ''}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.inkSoft }]}>Générer un code</Text>
        <Text style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 8 }}>
          Valable 5 minutes, à partager à la personne qui rejoint.
        </Text>
        <Pill
          label={inviteCode ? `Code : ${inviteCode}` : 'Générer un code (5 min)'}
          variant="primary"
          onPress={async () => {
            try {
              const code = await createHouseholdInvite();
              setInviteCode(code);
              setInviteError(null);
            } catch (e: any) {
              setInviteError(e.message ?? 'Erreur');
            }
          }}
        />
        {inviteError ? <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 6 }}>{inviteError}</Text> : null}

        <Text style={[styles.section, { color: colors.inkSoft, marginTop: 20 }]}>Rejoindre un foyer</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="Code reçu"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="characters"
            style={{ flex: 1, fontSize: 13.5, color: colors.ink, borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 }}
          />
          <Pill
            label={joinBusy ? '…' : 'Rejoindre'}
            variant="ghost"
            disabled={joinBusy || !joinCode.trim()}
            onPress={async () => {
              setJoinBusy(true);
              try {
                await joinHouseholdWithCode(userId, joinCode.trim());
                setJoinCode('');
                setJoinError(null);
                load();
                reloadTaxonomies();
              } catch (e: any) {
                setJoinError(e.message ?? 'Code invalide ou expiré');
              } finally {
                setJoinBusy(false);
              }
            }}
          />
        </View>
        {joinError ? <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 6 }}>{joinError}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
});
