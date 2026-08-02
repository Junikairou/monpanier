import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, EmptyState, LoadingBlock, Screen, ScreenHeader } from '../../../src/components/ui';
import { listRecentPlanningEntries, removeMeal } from '../../../src/data/planning';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { PlanningEntry } from '../../../src/types/models';
import { formatShortDayMonth } from '../../../src/lib/dates';
import { fonts } from '../../../src/theme/tokens';

export default function Historique() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { label } = useTaxonomies();

  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listRecentPlanningEntries(60)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = (entry: PlanningEntry) => {
    const run = async () => {
      setRemovingId(entry.id);
      try {
        await removeMeal(session!.user.id, entry.id);
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      } finally {
        setRemovingId(null);
      }
    };
    const message = `Retirer "${entry.dish?.name ?? 'ce repas'}" du ${formatShortDayMonth(new Date(entry.date))} ?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Retirer ce repas ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="Historique" subtitle="Derniers ajouts au planning" onBack={() => router.back()} />
      {loading ? (
        <LoadingBlock />
      ) : entries.length === 0 ? (
        <EmptyState text="Rien à afficher pour l'instant." />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 8 }}>
          {entries.map((entry) => (
            <Card key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                  {formatShortDayMonth(new Date(entry.date))} · {label('meal_slot', entry.slot)}
                </Text>
                <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>
                  {entry.is_restaurant ? '🍽️ Au restaurant' : entry.dish?.name ?? 'Plat supprimé'}
                </Text>
              </View>
              {entry.dish ? (
                <Pressable onPress={() => router.push({ pathname: '/plat/[id]', params: { id: entry.dish!.id, entryId: entry.id } })}>
                  <Text style={{ fontSize: 12, color: colors.forest }}>Modifier</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => remove(entry)} disabled={removingId === entry.id} hitSlop={6}>
                <Text style={{ fontSize: 12, color: colors.danger }}>{removingId === entry.id ? '…' : 'Retirer'}</Text>
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
