import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile, updateProfile } from '../../../src/data/profile';
import { pickAndUploadAvatar } from '../../../src/data/avatar';
import { fonts } from '../../../src/theme/tokens';

export default function MonProfil() {
  const { colors } = useTheme();
  const { session, signOut, resetPassword } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const isGoogle = session!.user.app_metadata?.provider === 'google';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getProfile(userId)
      .then((p) => {
        setProfile(p);
        setNameDraft(p.display_name ?? '');
        setPhoneDraft(p.phone ?? '');
      })
      .finally(() => setLoading(false));
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

  const onPickAvatar = async () => {
    setUploading(true);
    setAvatarError(null);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    } catch (e: any) {
      setAvatarError(e.message ?? 'Erreur lors du téléversement.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !profile) {
    return (
      <Screen>
        <ScreenHeader title="Mon profil" onBack={() => router.back()} />
        <LoadingBlock />
      </Screen>
    );
  }

  const initial = (profile.display_name || session!.user.email || '?').charAt(0).toUpperCase();

  return (
    <Screen>
      <ScreenHeader title="Mon profil" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Pressable onPress={onPickAvatar} disabled={uploading}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
                <Text style={{ fontSize: 26, fontFamily: fonts.display, color: colors.forestDark }}>{initial}</Text>
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.forest }]}>
              <Text style={{ color: '#FFF', fontSize: 11 }}>{uploading ? '…' : '✏️'}</Text>
            </View>
          </Pressable>
          {avatarError ? <Text style={{ fontSize: 11, color: colors.danger, marginTop: 6 }}>{avatarError}</Text> : null}
          <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 8 }}>{session!.user.email}</Text>
        </View>

        <Row label="Pseudo" colors={colors}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={() => nameDraft !== (profile.display_name ?? '') && patch({ display_name: nameDraft || null })}
            placeholder="Ton nom"
            placeholderTextColor={colors.inkFaint}
            style={{ fontSize: 13.5, color: colors.ink, textAlign: 'right', minWidth: 120 }}
          />
        </Row>

        <Row label="Téléphone" hint="Information seulement, non utilisée pour la connexion" colors={colors}>
          <TextInput
            value={phoneDraft}
            onChangeText={setPhoneDraft}
            onBlur={() => phoneDraft !== (profile.phone ?? '') && patch({ phone: phoneDraft || null })}
            placeholder="Ajouter"
            placeholderTextColor={colors.inkFaint}
            keyboardType="phone-pad"
            style={{ fontSize: 13.5, color: colors.ink, textAlign: 'right', minWidth: 120 }}
          />
        </Row>

        <View style={{ marginTop: 20, gap: 10 }}>
          {isGoogle ? (
            <Text style={{ fontSize: 11.5, color: colors.inkSoft, fontStyle: 'italic' }}>
              Ce compte se connecte avec Google : le mot de passe est géré directement par Google.
            </Text>
          ) : (
            <>
              <Pill
                label={resetSent ? '✓ Lien envoyé par e-mail' : 'Changer le mot de passe'}
                variant="ghost"
                onPress={async () => {
                  const err = await resetPassword(session!.user.email!);
                  if (err) setResetError(err);
                  else {
                    setResetError(null);
                    setResetSent(true);
                  }
                }}
              />
              {resetError ? <Text style={{ fontSize: 11, color: colors.inkSoft }}>{resetError}</Text> : null}
            </>
          )}

          <Pill label="Réinitialiser des données" variant="ghost" onPress={() => router.push('/(tabs)/profil/reinitialiser')} />
          <Pill label="Changer de compte" variant="ghost" onPress={signOut} />
          <Pill label="Se déconnecter" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  hint,
  colors,
  children,
}: {
  label: string;
  hint?: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.row, { borderColor: colors.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, color: colors.ink }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 76, height: 76, borderRadius: 38 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
});
