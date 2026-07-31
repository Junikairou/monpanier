import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Checkbox, Chip, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { ActionSheet } from '../../../src/components/ActionSheet';
import { deleteDish, listDishes, seedDemoDishes } from '../../../src/data/dishes';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { Category, Dish } from '../../../src/types/models';
import { cardShadow, fonts, radii } from '../../../src/theme/tokens';

export default function PlatsIndex() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { categories, label } = useTaxonomies();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<Category | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listDishes()
      .then(setDishes)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = filter ? dishes.filter((d) => d.category === filter) : dishes;

  const onSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoDishes(session!.user.id);
      load();
    } finally {
      setSeeding(false);
    }
  };

  const toggleManage = () => {
    setManageMode((m) => !m);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmDelete = () => {
    if (selected.size === 0) return;
    const run = async () => {
      setDeleting(true);
      try {
        for (const id of selected) await deleteDish(id);
        setSelected(new Set());
        setManageMode(false);
        load();
      } finally {
        setDeleting(false);
      }
    };
    const message = `Supprimer ${selected.size} plat${selected.size > 1 ? 's' : ''} ? Cette action est définitive.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Supprimer ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Tous les plats"
        subtitle={`${dishes.length} plat${dishes.length > 1 ? 's' : ''}`}
        right={
          dishes.length > 0 ? (
            <Pill label={manageMode ? 'Terminé' : 'Gérer'} variant={manageMode ? 'primary' : 'ghost'} onPress={toggleManage} />
          ) : undefined
        }
      />
      <View style={styles.topActions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
          <Chip label="Tous" active={filter === null} onPress={() => setFilter(null)} />
          {categories.map((c) => (
            <Chip key={c.key} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingBlock />
      ) : dishes.length === 0 ? (
        <View style={{ padding: 18 }}>
          <EmptyState text="Aucun plat pour l'instant." />
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            <Pill label="+ Créer un plat" variant="primary" onPress={() => setAddMenuOpen(true)} />
            <Pill label={seeding ? '…' : 'Ajouter des exemples'} onPress={onSeed} disabled={seeding} />
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={visible}
            keyExtractor={(d) => d.id}
            contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10, paddingBottom: manageMode ? 90 : 18 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.forest} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  manageMode
                    ? toggleSelect(item.id)
                    : router.push({ pathname: '/plat/[id]', params: { id: item.id } })
                }
                style={[styles.row, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink }]}
              >
                {manageMode ? <Checkbox checked={selected.has(item.id)} onPress={() => toggleSelect(item.id)} /> : null}
                <View style={[styles.thumb, { backgroundColor: colors.sagePale }]}>
                  <Text style={{ fontSize: 22 }}>{item.image_emoji ?? '🍽️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.honey, fontFamily: fonts.bodySemiBold }}>
                    {label('category', item.category)}
                  </Text>
                  <Text style={{ fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink, marginTop: 2 }}>{item.name}</Text>
                </View>
                {!manageMode ? <Text style={{ color: colors.inkSoft, fontSize: 16 }}>›</Text> : null}
              </Pressable>
            )}
          />
          {manageMode ? (
            <View style={[styles.manageBar, { backgroundColor: colors.paper, borderColor: colors.line }]}>
              <Pill
                label={selected.size === visible.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                variant="ghost"
                onPress={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((d) => d.id)))}
              />
              <Pill
                label={deleting ? '…' : `Supprimer (${selected.size})`}
                variant="primary"
                disabled={deleting || selected.size === 0}
                onPress={confirmDelete}
              />
            </View>
          ) : (
            <Pressable onPress={() => setAddMenuOpen(true)} style={[styles.fab, { backgroundColor: colors.forest, shadowColor: colors.forest }]}>
              <Text style={{ color: '#FFF', fontSize: 22, marginTop: -2 }}>＋</Text>
            </Pressable>
          )}
        </>
      )}

      <ActionSheet
        visible={addMenuOpen}
        title="Nouveau plat"
        actions={[
          { label: '📖 Piocher dans le catalogue', onPress: () => router.push('/catalogue') },
          { label: '✏️ Créer une nouvelle recette', onPress: () => router.push('/(tabs)/plats/new') },
        ]}
        onClose={() => setAddMenuOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: radii.md },
  thumb: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  manageBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
});
