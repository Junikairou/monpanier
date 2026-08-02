import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, Checkbox, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { CalendarPicker } from '../../../src/components/CalendarPicker';
import { deleteRecurrenceGroupAll, listRecentPlanningEntries, removeMeal, setEntryDate, shiftRecurrenceGroup } from '../../../src/data/planning';
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
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [dateEditGroup, setDateEditGroup] = useState<Group | null>(null);
  const [savingDate, setSavingDate] = useState(false);

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

  const saveDate = async (iso: string) => {
    if (!dateEditGroup) return;
    setSavingDate(true);
    try {
      if (dateEditGroup.groupId) {
        await shiftRecurrenceGroup(dateEditGroup.groupId, dateEditGroup.entries, iso);
      } else {
        await setEntryDate(dateEditGroup.entries[0].id, iso);
      }
      setDateEditGroup(null);
      load();
    } finally {
      setSavingDate(false);
    }
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    const run = async () => {
      setBulkDeleting(true);
      try {
        for (const group of groups.filter((g) => selected.has(g.key))) {
          if (group.groupId) await deleteRecurrenceGroupAll(group.groupId);
          else await removeMeal(session!.user.id, group.entries[0].id);
        }
        setSelected(new Set());
        setManageMode(false);
        load();
      } finally {
        setBulkDeleting(false);
      }
    };
    const message = `Retirer ${selected.size} entrée${selected.size > 1 ? 's' : ''} de l'historique (et du planning) ?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Retirer ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Historique"
        subtitle="Derniers ajouts au planning"
        onBack={() => router.back()}
        right={
          groups.length > 0 ? (
            <Pill
              label={manageMode ? 'Terminé' : 'Gérer'}
              variant={manageMode ? 'primary' : 'ghost'}
              onPress={() => {
                setManageMode((m) => !m);
                setSelected(new Set());
              }}
            />
          ) : undefined
        }
      />
      {loading ? (
        <LoadingBlock />
      ) : groups.length === 0 ? (
        <EmptyState text="Rien à afficher pour l'instant." />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 8, paddingBottom: manageMode ? 90 : 18 }}>
          {groups.map((group) => {
            const first = group.entries[0];
            const isSeries = group.entries.length > 1;
            const gapDays = isSeries
              ? Math.round((new Date(group.entries[1].date).getTime() - new Date(first.date).getTime()) / 86400000)
              : 0;
            return (
              <Card key={group.key} style={{ gap: 6, flexDirection: 'row' }}>
                {manageMode ? <Checkbox checked={selected.has(group.key)} onPress={() => toggleSelect(group.key)} /> : null}
                <View style={{ flex: 1, gap: 6 }}>
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
                  {!manageMode ? (
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      {first.dish ? (
                        <Pressable onPress={() => router.push({ pathname: '/plat/[id]', params: { id: first.dish!.id, entryId: first.id } })}>
                          <Text style={{ fontSize: 12, color: colors.forest }}>Voir la recette</Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => setDateEditGroup(group)} disabled={savingDate} hitSlop={6}>
                        <Text style={{ fontSize: 12, color: colors.forest }}>{isSeries ? 'Modifier la date de départ' : 'Modifier la date'}</Text>
                      </Pressable>
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
                  ) : null}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
      {manageMode ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
          <Pill
            label={selected.size === groups.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            variant="ghost"
            onPress={() => setSelected(selected.size === groups.length ? new Set() : new Set(groups.map((g) => g.key)))}
          />
          <Pill
            label={bulkDeleting ? '…' : `Retirer (${selected.size})`}
            variant="primary"
            disabled={bulkDeleting || selected.size === 0}
            onPress={bulkDelete}
          />
        </View>
      ) : null}
      {dateEditGroup ? (
        <CalendarPicker
          visible
          selectedDate={dateEditGroup.entries[0].date}
          onSelect={saveDate}
          onClose={() => setDateEditGroup(null)}
        />
      ) : null}
    </Screen>
  );
}
