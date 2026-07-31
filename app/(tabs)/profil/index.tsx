import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile, updateProfile } from '../../../src/data/profile';
import { createHouseholdInvite, joinHouseholdWithCode, listHouseholdMembers } from '../../../src/data/household';
import { MEAL_SLOT_LABELS, MEAL_SLOT_ORDER, MealSlot } from '../../../src/types/models';
import { fonts } from '../../../src/theme/tokens';

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

export default function Profil() {
  const { colors, preference, setPreference } = useTheme();
  const { session, signOut, resetPassword } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getProfile(userId)
      .then((p) => {
        setProfile(p);
        setPhoneDraft(p.phone ?? '');
      })
      .finally(() => setLoading(false));
    listHouseholdMembers().then((m) => setMemberCount(m.length));
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

  if (loading || !profile) {
    return (
      <Screen>
        <ScreenHeader title="Mon profil" />
        <LoadingBlock />
      </Screen>
    );
  }

  const initial = (profile.display_name || session!.user.email || '?').charAt(0).toUpperCase();

  return (
    <Screen>
      <ScreenHeader title="Mon profil" />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={[styles.avatarRow, { borderColor: colors.line }]}>
          <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
            <Text style={{ fontSize: 20, fontFamily: fonts.display, color: colors.forestDark }}>{initial}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, color: colors.ink, fontFamily: fonts.display }}>
              {profile.display_name || 'Mon profil'}
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.inkSoft }}>{session!.user.email}</Text>
          </View>
        </View>

        <SectionLabel text="Recettes" />
        <Row label="📖 Catalogue de recettes" hint="Des idées prêtes à ajouter à Mes plats">
          <Pill label="Voir" variant="ghost" onPress={() => router.push('/(tabs)/plats/catalogue')} />
        </Row>

        <SectionLabel text="Compte" />
        <Row label="Téléphone" hint="Information seulement, non utilisée pour la connexion">
          <TextInput
            value={phoneDraft}
            onChangeText={setPhoneDraft}
            onBlur={() => {
              if (phoneDraft !== (profile.phone ?? '')) patch({ phone: phoneDraft || null });
            }}
            placeholder="Ajouter"
            placeholderTextColor={colors.inkFaint}
            keyboardType="phone-pad"
            style={{ fontSize: 13.5, color: colors.ink, textAlign: 'right', minWidth: 120 }}
          />
        </Row>
        <View style={{ paddingVertical: 11 }}>
          <Pill
            label={resetSent ? '✓ Lien envoyé par e-mail' : 'Réinitialiser le mot de passe'}
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
          {resetError ? (
            <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 6 }}>{resetError}</Text>
          ) : null}
        </View>

        <SectionLabel text="Foyer" />
        <Row label="Personnes dans le foyer" hint="Ajuste les portions par défaut">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => patch({ household_size: Math.max(1, profile.household_size - 1) })}>
              <Text style={{ color: colors.forest, fontSize: 18 }}>–</Text>
            </Pressable>
            <Text style={{ color: colors.ink, fontSize: 14, minWidth: 16, textAlign: 'center' }}>{profile.household_size}</Text>
            <Pressable onPress={() => patch({ household_size: profile.household_size + 1 })}>
              <Text style={{ color: colors.forest, fontSize: 18 }}>+</Text>
            </Pressable>
          </View>
        </Row>

        <SectionLabel text="Partage du foyer" />
        <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginBottom: 8 }}>
          Le planning et la liste de courses sont partagés avec les membres de ton foyer
          {memberCount != null ? ` (${memberCount} membre${memberCount > 1 ? 's' : ''} actuellement)` : ''}.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
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
        </View>
        {inviteError ? <Text style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 8 }}>{inviteError}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 }}>
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
              } catch (e: any) {
                setJoinError(e.message ?? 'Code invalide ou expiré');
              } finally {
                setJoinBusy(false);
              }
            }}
          />
        </View>
        {joinError ? <Text style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 4 }}>{joinError}</Text> : null}

        <SectionLabel text="Repas à planifier" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
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

        <SectionLabel text="Planning" />
        <Row label="Indicateur repas équilibré" hint="Avertit quand un repas n'a pas d'accompagnement/fruit">
          <Switch
            value={profile.show_balance_hint}
            onValueChange={(v) => patch({ show_balance_hint: v })}
            trackColor={{ true: colors.forest }}
          />
        </Row>

        <SectionLabel text="Apparence" />
        <Row label="Thème">
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
        </Row>

        <SectionLabel text="Langue" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          {LANGUAGES.map((l) => (
            <Pill key={l.code} label={l.label} variant={profile.language === l.code ? 'primary' : 'default'} onPress={() => patch({ language: l.code })} />
          ))}
        </View>
        {profile.language !== 'fr' ? (
          <Text style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 10, fontStyle: 'italic' }}>
            Préférence enregistrée — la traduction complète de l'interface arrive dans une prochaine version.
          </Text>
        ) : null}

        <SectionLabel text="Unités" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <Pill label="Métrique (g, ml)" variant={profile.units === 'metric' ? 'primary' : 'default'} onPress={() => patch({ units: 'metric' })} />
          <Pill label="Impérial (oz, cup)" variant={profile.units === 'imperial' ? 'primary' : 'default'} onPress={() => patch({ units: 'imperial' })} />
        </View>

        <View style={{ marginTop: 30 }}>
          <Pill label="Se déconnecter" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.section, { color: colors.inkSoft }]}>{text}</Text>;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
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
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, marginBottom: 6 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
  themeSwatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
