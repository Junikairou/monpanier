import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Checkbox, Chip, EmptyState, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { ActionSheet } from '../../../src/components/ActionSheet';
import { PullToRefresh } from '../../../src/components/PullToRefresh';
import { deleteDish, listDishes, listIngredientNamesByDish, listIngredientRayonByDish, seedDemoDishes, setDishPublic, updateDishClassification } from '../../../src/data/dishes';
import { useTaxonomies } from '../../../src/lib/taxonomies';
import { Category, Dish, GroceryCategory } from '../../../src/types/models';
import { cardShadow, fonts, radii } from '../../../src/theme/tokens';
import { noSelectWebStyle, useWebHorizontalDrag } from '../../../src/lib/webDragScroll';

export default function PlatsIndex() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { categories, courseTypes, groceryCategories, label, iconFor } = useTaxonomies();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredientNamesByDish, setIngredientNamesByDish] = useState<Record<string, string[]>>({});
  const [rayonByDish, setRayonByDish] = useState<Record<string, GroceryCategory>>({});
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<Category | null>(null);
  const [rayonFilter, setRayonFilter] = useState<GroceryCategory | null>(null);
  const [kind, setKind] = useState<'recettes' | 'tout_pret'>('recettes');
  const [query, setQuery] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const scrollOffsetRef = useRef(0);
  const [moveKindOpen, setMoveKindOpen] = useState(false);
  const [moveTargetKind, setMoveTargetKind] = useState<'category' | 'course_type' | null>(null);
  const [moving, setMoving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const catDrag = useWebHorizontalDrag();

  const load = useCallback(() => {
    setLoading(true);
    listDishes(session!.user.id)
      .then(async (d) => {
        setDishes(d);
        setIngredientNamesByDish(await listIngredientNamesByDish(d.map((x) => x.id)));
        setRayonByDish(await listIngredientRayonByDish(d.filter((x) => x.is_ready_made).map((x) => x.id)));
      })
      .finally(() => setLoading(false));
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const q = query.trim().toLowerCase();
  const readyMadeCount = dishes.filter((d) => d.is_ready_made).length;
  const visible = dishes
    .filter((d) => (kind === 'tout_pret' ? d.is_ready_made : !d.is_ready_made))
    .filter((d) => (kind === 'tout_pret' ? !rayonFilter || rayonByDish[d.id] === rayonFilter : !filter || d.category === filter))
    .filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        (ingredientNamesByDish[d.id] ?? []).some((n) => n.toLowerCase().includes(q)),
    );

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

  const applyMove = async (key: string) => {
    if (!moveTargetKind || selected.size === 0) return;
    setMoving(true);
    try {
      for (const id of selected) await updateDishClassification(id, { [moveTargetKind]: key } as any);
      setSelected(new Set());
      setManageMode(false);
      load();
    } finally {
      setMoving(false);
      setMoveTargetKind(null);
    }
  };

  const publishSelected = async () => {
    if (selected.size === 0) return;
    setPublishing(true);
    try {
      for (const id of selected) await setDishPublic(id, true);
      setSelected(new Set());
      setManageMode(false);
      load();
    } finally {
      setPublishing(false);
    }
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
      {dishes.length > 0 ? (
        <View style={[styles.kindSwitch, { backgroundColor: colors.beige }]}>
          <Pressable style={[styles.kindOpt, kind === 'recettes' && { backgroundColor: colors.paper }]} onPress={() => { setKind('recettes'); setRayonFilter(null); }}>
            <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: kind === 'recettes' ? colors.ink : colors.inkSoft }}>📖 Recettes</Text>
          </Pressable>
          <Pressable style={[styles.kindOpt, kind === 'tout_pret' && { backgroundColor: colors.paper }]} onPress={() => { setKind('tout_pret'); setFilter(null); }}>
            <Text style={{ fontSize: 11.5, fontFamily: fonts.bodyMedium, color: kind === 'tout_pret' ? colors.ink : colors.inkSoft }}>
              🛒 Alimentation {readyMadeCount > 0 ? `(${readyMadeCount})` : ''}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {dishes.length > 0 ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un plat ou un ingrédient..."
            placeholderTextColor={colors.inkFaint}
            style={{ borderWidth: 1.5, borderColor: colors.beigeDark, borderRadius: radii.sm, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13, color: colors.ink, backgroundColor: colors.paper }}
          />
        </View>
      ) : null}
      <View style={styles.topActions}>
        <ScrollView
          ref={catDrag.ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 12 }}
          style={noSelectWebStyle}
          {...catDrag.handlers}
        >
          {kind === 'tout_pret' ? (
            <>
              <Chip label="Tous" active={rayonFilter === null} onPress={() => setRayonFilter(null)} />
              {groceryCategories.map((c) => (
                <Chip key={c.key} label={`${c.icon ?? ''} ${c.label}`.trim()} active={rayonFilter === c.key} onPress={() => setRayonFilter(c.key)} />
              ))}
            </>
          ) : (
            <>
              <Chip label="Tous" active={filter === null} onPress={() => setFilter(null)} />
              {categories.map((c) => (
                <Chip key={c.key} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
              ))}
            </>
          )}
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
      ) : visible.length === 0 ? (
        <View style={{ padding: 18 }}>
          <EmptyState
            text={
              q || filter || rayonFilter
                ? 'Aucun plat ne correspond à cette recherche.'
                : kind === 'tout_pret'
                  ? "Aucun article dans Alimentation pour l'instant."
                  : 'Aucune recette pour l\'instant.'
            }
          />
          {!q && !filter && !rayonFilter ? (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Pill label="+ Ajouter un plat" variant="primary" onPress={() => setAddMenuOpen(true)} />
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <PullToRefresh onRefresh={load} scrollOffsetRef={scrollOffsetRef}>
          <FlatList
            style={{ flex: 1 }}
            data={visible}
            keyExtractor={(d) => d.id}
            contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10, paddingBottom: manageMode ? 90 : 18 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.forest} />}
            onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
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
                    {item.is_ready_made ? `${iconFor(rayonByDish[item.id])} ${label('grocery_category', rayonByDish[item.id] ?? 'autre')}` : label('category', item.category)}
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
                label="Ranger dans..."
                variant="ghost"
                disabled={selected.size === 0}
                onPress={() => setMoveKindOpen(true)}
              />
              <Pill
                label={publishing ? '…' : '🌍 Publier au catalogue'}
                variant="ghost"
                disabled={publishing || selected.size === 0}
                onPress={publishSelected}
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
          </PullToRefresh>
        </>
      )}

      <ActionSheet
        visible={moveKindOpen}
        title={`Ranger ${selected.size} plat${selected.size > 1 ? 's' : ''} par...`}
        actions={[
          { label: '📁 Catégorie de plat', onPress: () => setMoveTargetKind('category') },
          { label: '📁 Type de plat', onPress: () => setMoveTargetKind('course_type') },
        ]}
        onClose={() => setMoveKindOpen(false)}
      />

      <ActionSheet
        visible={moveTargetKind !== null}
        title={moving ? 'Déplacement…' : moveTargetKind === 'category' ? 'Choisir la catégorie' : 'Choisir le type'}
        actions={(moveTargetKind === 'category' ? categories : courseTypes).map((c) => ({
          label: `${c.icon ?? ''} ${c.label}`.trim(),
          onPress: () => applyMove(c.key),
        }))}
        onClose={() => setMoveTargetKind(null)}
      />

      <ActionSheet
        visible={addMenuOpen}
        title="Nouveau plat"
        actions={[
          { label: '📖 Piocher dans le catalogue', onPress: () => router.push('/catalogue') },
          { label: '✏️ Créer une nouvelle recette', onPress: () => router.push('/(tabs)/plats/new') },
          { label: '📋 Importer un texte de recette', onPress: () => router.push('/plat/importer') },
          { label: '🛒 Ajouter à Alimentation', onPress: () => router.push({ pathname: '/(tabs)/plats/new', params: { readyMade: '1' } }) },
        ]}
        onClose={() => setAddMenuOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kindSwitch: { flexDirection: 'row', marginHorizontal: 18, marginTop: 12, borderRadius: radii.sm, padding: 3, gap: 2 },
  kindOpt: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 6 },
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
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
});
