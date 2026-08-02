import React, { useCallback, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { getProfile, Profile } from '../../../src/data/profile';
import {
  acceptFriendRequest,
  dismissReceivedRecipe,
  formatFriendTag,
  FriendProfile,
  FriendRequests,
  listFriendRequests,
  listFriends,
  listMyMealInvites,
  listReceivedRecipes,
  MealInvite,
  ReceivedRecipe,
  removeFriendship,
  sendFriendRequest,
} from '../../../src/data/friends';
import { copyDishToMyPlats } from '../../../src/data/dishes';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { formatShortDayMonth } from '../../../src/lib/dates';
import { fonts, radii } from '../../../src/theme/tokens';

function confirm(message: string, run: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) run();
    return;
  }
  Alert.alert('Confirmer', message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Confirmer', style: 'destructive', onPress: run },
  ]);
}

function Avatar({ profile }: { profile: { display_name: string | null; avatar_url: string | null } }) {
  const { colors } = useTheme();
  if (profile.avatar_url) return <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />;
  return (
    <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
      <Text style={{ fontSize: 14, fontFamily: fonts.display, color: colors.forestDark }}>
        {(profile.display_name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function Amis() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const { label } = useTaxonomies();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<FriendProfile[] | null>(null);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [recipes, setRecipes] = useState<ReceivedRecipe[]>([]);
  const [invites, setInvites] = useState<MealInvite[]>([]);

  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    getProfile(userId).then(setProfile);
    listFriends(userId).then(setFriends);
    listFriendRequests(userId).then(setRequests);
    listReceivedRecipes().then(setRecipes).catch(() => setRecipes([]));
    listMyMealInvites(userId).then(setInvites).catch(() => setInvites([]));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const myTag = profile ? formatFriendTag(profile.display_name, profile.tag) : '';

  const copyMyTag = () => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(myTag).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  const submitAdd = async () => {
    setAddBusy(true);
    setAddError(null);
    try {
      await sendFriendRequest(userId, addInput);
      setAddInput('');
      load();
    } catch (e: any) {
      setAddError(e.message ?? 'Erreur');
    } finally {
      setAddBusy(false);
    }
  };

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (!profile || !friends) {
    return (
      <Screen>
        <ScreenHeader title="Amis" onBack={() => router.back()} />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Amis" subtitle="Partage des recettes, invite à un repas" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Text style={[styles.section, { color: colors.inkSoft }]}>Mon identifiant</Text>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Avatar profile={profile} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink }}>{myTag}</Text>
            <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 2 }}>
              Donne-le à tes amis pour qu'ils t'ajoutent
            </Text>
          </View>
          {Platform.OS === 'web' ? <Pill label={copied ? '✓ Copié' : 'Copier'} variant="ghost" onPress={copyMyTag} /> : null}
        </Card>
        {!profile.display_name ? (
          <Text style={{ fontSize: 11, color: colors.honey, marginBottom: 14 }}>
            Choisis d'abord un pseudo dans Mon profil : ton identifiant en dépend.
          </Text>
        ) : (
          <View style={{ height: 14 }} />
        )}

        <Text style={[styles.section, { color: colors.inkSoft }]}>Ajouter un ami</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={addInput}
            onChangeText={setAddInput}
            placeholder="Pseudo#1234"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            onSubmitEditing={() => addInput.trim() && submitAdd()}
            style={{
              flex: 1,
              fontSize: 13.5,
              color: colors.ink,
              borderWidth: 1.5,
              borderColor: colors.beigeDark,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 10,
            }}
          />
          <Pill label={addBusy ? '…' : 'Ajouter'} variant="primary" disabled={addBusy || !addInput.trim()} onPress={submitAdd} />
        </View>
        {addError ? <Text style={{ fontSize: 11, color: colors.honey, marginTop: 6 }}>{addError}</Text> : null}

        {requests.incoming.length > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.inkSoft, marginTop: 22 }]}>
              Demandes reçues ({requests.incoming.length})
            </Text>
            <View style={{ gap: 8 }}>
              {requests.incoming.map((r) => (
                <View key={r.friendshipId} style={[styles.row, { borderColor: colors.line }]}>
                  <Avatar profile={r} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.ink }}>{r.display_name || 'Quelqu\'un'}</Text>
                  <Pill
                    label={busyId === r.friendshipId ? '…' : 'Accepter'}
                    variant="primary"
                    disabled={busyId === r.friendshipId}
                    onPress={() => act(r.friendshipId, () => acceptFriendRequest(r.friendshipId))}
                  />
                  <Pressable onPress={() => act(r.friendshipId, () => removeFriendship(r.friendshipId))} hitSlop={8}>
                    <Text style={{ fontSize: 12, color: colors.inkFaint }}>Refuser</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {requests.outgoing.length > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.inkSoft, marginTop: 22 }]}>Demandes envoyées</Text>
            <View style={{ gap: 8 }}>
              {requests.outgoing.map((r) => (
                <View key={r.friendshipId} style={[styles.row, { borderColor: colors.line }]}>
                  <Avatar profile={r} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.inkSoft }}>
                    {r.display_name || 'Quelqu\'un'} · en attente
                  </Text>
                  <Pressable onPress={() => act(r.friendshipId, () => removeFriendship(r.friendshipId))} hitSlop={8}>
                    <Text style={{ fontSize: 12, color: colors.inkFaint }}>Annuler</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {recipes.length > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.inkSoft, marginTop: 22 }]}>
              📥 Recettes reçues ({recipes.length})
            </Text>
            <View style={{ gap: 8 }}>
              {recipes.map((r) => (
                <Card key={r.id} style={{ gap: 8 }}>
                  <Pressable onPress={() => router.push({ pathname: '/plat/[id]', params: { id: r.dish.id } })}>
                    <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink }}>
                      {r.dish.image_emoji || '🍽️'} {r.dish.name}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 2 }}>Envoyée par {r.fromName}</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                    <Pressable
                      disabled={busyId === r.id}
                      onPress={() =>
                        act(r.id, async () => {
                          await copyDishToMyPlats(userId, r.dish);
                          await dismissReceivedRecipe(r.id);
                        })
                      }
                    >
                      <Text style={{ fontSize: 12, color: colors.forest }}>
                        {busyId === r.id ? '…' : '+ Ajouter à Mes plats'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => act(r.id, () => dismissReceivedRecipe(r.id))} hitSlop={6}>
                      <Text style={{ fontSize: 12, color: colors.inkFaint }}>Ignorer</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        {invites.length > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.inkSoft, marginTop: 22 }]}>
              🍽️ Repas où je suis invité ({invites.length})
            </Text>
            <View style={{ gap: 8 }}>
              {invites.map((inv) => (
                <Card key={inv.id}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/repas-invite',
                        params: { id: inv.id, householdId: inv.household_id, date: inv.date, slot: inv.slot, from: inv.fromName },
                      })
                    }
                  >
                    <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink }}>
                      {label('meal_slot', inv.slot)} · {formatShortDayMonth(new Date(inv.date))}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 2 }}>
                      Chez {inv.fromName} — voir les plats et la liste de courses
                    </Text>
                  </Pressable>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        <Text style={[styles.section, { color: colors.inkSoft, marginTop: 22 }]}>Mes amis ({friends.length})</Text>
        {friends.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.inkFaint }}>
            Personne pour l'instant. Demande son identifiant à un ami et ajoute-le ci-dessus.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {friends.map((f) => (
              <View key={f.friendshipId} style={[styles.row, { borderColor: colors.line }]}>
                <Avatar profile={f} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.ink }}>{f.display_name || 'Ami'}</Text>
                <Pressable
                  onPress={() =>
                    confirm(`Retirer ${f.display_name || 'cet ami'} de tes amis ?`, () =>
                      act(f.friendshipId, () => removeFriendship(f.friendshipId)),
                    )
                  }
                  hitSlop={8}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.cream,
                    borderColor: colors.beige,
                  }}
                >
                  <Text style={{ color: colors.inkFaint, fontSize: 11 }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 24, lineHeight: 15 }}>
          Ton identifiant se lit "Pseudo#1234" : plusieurs personnes peuvent avoir le même pseudo, le numéro les
          distingue. Il change si tu changes de pseudo.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
});
