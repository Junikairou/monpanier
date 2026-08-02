import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, EmptyState, LoadingBlock, Screen, ScreenHeader } from '../../../src/components/ui';
import { deleteRecurrenceGroupAll, listRecentPlanningEntries, removeMeal } from '../../../src/data/planning';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { PlanningEntry } from '../../../src/types/models';
import { formatShortDayMonth } from '../../../src/lib/dates';
import { fonts } from '../../../src/theme/tokens';

const FREQ_LABELS: Record<number, string> = {
  1: 'Tous les jours',
  2: 'Tous les 2 jours',
  7: 'Toutes les semaines',
  14: 'Une semaine sur deux',
};

function frequencyLabel(days: number): string {
  return FREQ_LABELS[days] ?? `Tous les ${days} jours`;
}

interface Group {
  key: string;
  entries: PlanningEntry[];
  groupId: string | null;
}

export default function Historique() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { label } = useTaxonomies();

  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listRecentPlanningEntries(150)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const groups = useMemo<Group[]>(() => {
    const byGroup = new Map<string, PlanningEntry[]>();
    const standalone: PlanningEntry[] = [];
    for (const e of entries) {
      if (e.recurrence_group_id) {
        const list = byGroup.get(e.recurrence_group_id) ?? [];
        list.push(e);
        byGroup.set(e.recurrence_group_id, list);
      } else {
        standalone.push(e);
      }
    }
    const grouped: Group[] = Array.from(byGroup.entries()).map(([groupId, list]) => ({
      key: groupId,
      entries: list.sort((a, b) => a.date.localeCompare(b.date)),
      groupId,
    }));
    const alone: Group[] = standalone.map((e) => ({ key: e.id, entries: [e], groupId: null }));
    return [...grouped, ...alone].sort((a, b) => (b.entries[0].created_at ?? '').localeCompare(a.entries[0].created_at ?? ''));
  }, [entries]);

  const removeStandalone = (entry: PlanningEntry) => {
    const run = async () => {
      setBusyKey(entry.id);
      try {
        await removeMeal(session!.user.id, entry.id);
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      } finally {
        setBusyKey(null);
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

  const removeGroup = (group: Group) => {
    const run = async () => {
      setBusyKey(group.key);
      try {
        await deleteRecurrenceGroupAll(group.groupId!);
        setEntries((prev) => prev.filter((e) => e.recurrence_group_id !== group.groupId));
      } finally {
        setBusyKey(null);
      }
    };
    const message = `Retirer toute la série "${group.entries[0].dish?.name ?? 'ce repas'}" (${group.entries.length} occurrences) ?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Retirer cette série ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="Historique" subtitle="Derniers ajouts au planning" onBack={() => router.back()} />
      {loading ? (
        <LoadingBlock />
      ) : groups.length === 0 ? (
        <EmptyState text="Rien à afficher pour l'instant." />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 8 }}>
          {groups.map((group) => {
            const first = group.entries[0];
            const isSeries = group.entries.length > 1;
            const gapDays = isSeries
              ? Math.round((new Date(group.entries[1].date).getTime() - new Date(first.date).getTime()) / 86400000)
              : 0;
            return (
              <Card key={group.key} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                      {label('meal_slot', first.slot)}
                    </Text>
                    <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>
                      {first.is_restaurant ? '🍽️ Au restaurant' : first.dish?.name ?? 'Plat supprimé'}
                    </Text>
                    {isSeries ? (
                      <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 2 }}>
                        Du {formatShortDayMonth(new Date(first.date))} au {formatShortDayMonth(new Date(group.entries[group.entries.length - 1].date))} · {frequencyLabel(gapDays)}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 2 }}>{formatShortDayMonth(new Date(first.date))}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  {first.dish ? (
                    <Pressable onPress={() => router.push({ pathname: '/plat/[id]', params: { id: first.dish!.id, entryId: first.id } })}>
                      <Text style={{ fontSize: 12, color: colors.forest }}>Voir la recette</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => (isSeries ? removeGroup(group) : removeStandalone(first))}
                    disabled={busyKey === group.key}
                    hitSlop={6}
                  >
                    <Text style={{ fontSize: 12, color: colors.danger }}>
                      {busyKey === group.key ? '…' : isSeries ? `Retirer toute la série (${group.entries.length})` : 'Retirer'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
