import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, Checkbox, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { CalendarPicker } from '../../../src/components/CalendarPicker';
import { ActionSheet } from '../../../src/components/ActionSheet';
import {
  deleteRecurrenceGroupAll,
  listRecentPlanningEntries,
  removeMeal,
  rescheduleRecurrenceGroup,
  setEntryDate,
} from '../../../src/data/planning';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { PlanningEntry } from '../../../src/types/models';
import { formatShortDayMonth } from '../../../src/lib/dates';
import { fonts, radii } from '../../../src/theme/tokens';

const FREQ_LABELS: Record<number, string> = {
  1: 'Tous les jours',
  2: 'Tous les 2 jours',
  3: 'Tous les 3 jours',
  7: 'Toutes les semaines',
  14: 'Une semaine sur deux',
};

const FREQ_CHOICES = [1, 2, 3, 7, 14];

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
  // Édition d'une série : date de début, date de fin et fréquence.
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editInterval, setEditInterval] = useState(1);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [freqMenuOpen, setFreqMenuOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const openEdit = (group: Group) => {
    const first = group.entries[0];
    const last = group.entries[group.entries.length - 1];
    const gap =
      group.entries.length > 1
        ? Math.round((new Date(group.entries[1].date).getTime() - new Date(first.date).getTime()) / 86400000)
        : 1;
    setEditGroup(group);
    setEditStart(first.date);
    setEditEnd(last.date);
    setEditInterval(gap > 0 ? gap : 1);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editGroup) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      if (editGroup.groupId) {
        await rescheduleRecurrenceGroup(editGroup.groupId, editGroup.entries, editStart, editEnd, editInterval);
      } else {
        await setEntryDate(editGroup.entries[0].id, editStart);
      }
      setEditGroup(null);
      load();
    } catch (e: any) {
      setEditError(e.message ?? 'Modification impossible.');
    } finally {
      setSavingEdit(false);
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
                      <Pressable onPress={() => openEdit(group)} hitSlop={6}>
                        <Text style={{ fontSize: 12, color: colors.forest }}>
                          {isSeries ? 'Modifier dates / répétition' : 'Modifier la date'}
                        </Text>
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
      {editGroup ? (
        <Modal transparent animationType="fade" onRequestClose={() => setEditGroup(null)}>
          <Pressable style={styles.backdrop} onPress={() => setEditGroup(null)}>
            <Pressable
              style={[styles.panel, { backgroundColor: colors.paper, borderColor: colors.line }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={{ fontSize: 14.5, fontFamily: fonts.bodySemiBold, color: colors.ink, marginBottom: 4 }}>
                {editGroup.entries[0].dish?.name ?? 'Ce repas'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.inkFaint, marginBottom: 14 }}>
                {editGroup.groupId
                  ? 'La série est régénérée avec ces réglages (les anciennes dates sont remplacées).'
                  : 'Corrige la date de ce repas.'}
              </Text>

              <Text style={styles.fieldLabel}>{editGroup.groupId ? 'Date de début' : 'Date'}</Text>
              <Pressable onPress={() => setPicker('start')} style={[styles.fieldBtn, { borderColor: colors.beigeDark }]}>
                <Text style={{ fontSize: 12.5, color: colors.ink }}>{formatShortDayMonth(new Date(editStart))}</Text>
              </Pressable>

              {editGroup.groupId ? (
                <>
                  <Text style={styles.fieldLabel}>Date de fin</Text>
                  <Pressable onPress={() => setPicker('end')} style={[styles.fieldBtn, { borderColor: colors.beigeDark }]}>
                    <Text style={{ fontSize: 12.5, color: colors.ink }}>{formatShortDayMonth(new Date(editEnd))}</Text>
                  </Pressable>

                  <Text style={styles.fieldLabel}>Répétition</Text>
                  <Pressable onPress={() => setFreqMenuOpen(true)} style={[styles.fieldBtn, { borderColor: colors.beigeDark }]}>
                    <Text style={{ fontSize: 12.5, color: colors.ink }}>{frequencyLabel(editInterval)}</Text>
                  </Pressable>
                </>
              ) : null}

              {editError ? <Text style={{ fontSize: 11.5, color: colors.danger, marginTop: 10 }}>{editError}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <Pill label={savingEdit ? '…' : 'Enregistrer'} variant="primary" disabled={savingEdit} onPress={saveEdit} />
                <Pill label="Annuler" variant="ghost" onPress={() => setEditGroup(null)} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {picker ? (
        <CalendarPicker
          visible
          selectedDate={picker === 'start' ? editStart : editEnd}
          onSelect={(iso) => {
            if (picker === 'start') {
              setEditStart(iso);
              // Garde une fin cohérente si la nouvelle date de début la dépasse.
              if (iso > editEnd) setEditEnd(iso);
            } else {
              setEditEnd(iso);
            }
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}

      <ActionSheet
        visible={freqMenuOpen}
        title="Répétition"
        actions={FREQ_CHOICES.map((days) => ({ label: frequencyLabel(days), onPress: () => setEditInterval(days) }))}
        onClose={() => setFreqMenuOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 340, borderRadius: radii.lg, borderWidth: 1, padding: 18 },
  fieldLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 5, opacity: 0.6 },
  fieldBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
});
