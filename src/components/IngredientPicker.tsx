import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radii } from '../theme/tokens';
import { CatalogIngredient } from '../data/ingredientsCatalog';
import { TaxonomyItem } from '../data/taxonomies';

interface IngredientPickerProps {
  visible: boolean;
  items: CatalogIngredient[];
  groceryCategories: TaxonomyItem[];
  onSelect: (item: CatalogIngredient) => void;
  onCreateNew: (name: string) => void;
  onCreateNewArticle: () => void;
  onClose: () => void;
}

export function IngredientPicker({ visible, items, groceryCategories, onSelect, onCreateNew, onCreateNewArticle, onClose }: IngredientPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [openRayon, setOpenRayon] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const countByRayon = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.grocery_category, (counts.get(item.grocery_category) ?? 0) + 1);
    return counts;
  }, [items]);

  const exactMatch = filtered.some((i) => i.name.toLowerCase() === query.trim().toLowerCase());
  const searching = query.trim().length > 0;
  const rayonItems = openRayon ? filtered.filter((i) => i.grocery_category === openRayon) : [];

  const close = () => {
    setQuery('');
    setOpenRayon(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.panel, { backgroundColor: colors.paper, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: colors.ink }]}>Choisir un article</Text>
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setOpenRayon(null);
            }}
            placeholder="Rechercher un article..."
            placeholderTextColor={colors.inkFaint}
            style={[styles.search, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
            autoFocus
          />
          <ScrollView style={{ maxHeight: 320 }}>
            {searching && !exactMatch ? (
              <Pressable
                onPress={() => {
                  onCreateNew(query.trim());
                  close();
                }}
                style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: 1 }]}
              >
                <Text style={{ fontSize: 13, fontFamily: fonts.bodySemiBold, color: colors.forest }}>
                  + Ajouter « {query.trim()} » comme nouvel article
                </Text>
              </Pressable>
            ) : null}

            {searching ? (
              filtered.length === 0 ? (
                <Text style={{ padding: 16, fontSize: 12, color: colors.inkFaint, textAlign: 'center' }}>Aucun résultat.</Text>
              ) : (
                filtered.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      onSelect(item);
                      close();
                    }}
                    style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: 1 }]}
                  >
                    <Text style={{ fontSize: 13.5, color: colors.ink }}>{item.name}</Text>
                  </Pressable>
                ))
              )
            ) : openRayon ? (
              <>
                <Pressable onPress={() => setOpenRayon(null)} style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: 1 }]}>
                  <Text style={{ fontSize: 12.5, color: colors.inkFaint }}>‹ Retour aux rayons</Text>
                </Pressable>
                {rayonItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      onSelect(item);
                      close();
                    }}
                    style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: 1 }]}
                  >
                    <Text style={{ fontSize: 13.5, color: colors.ink }}>{item.name}</Text>
                  </Pressable>
                ))}
              </>
            ) : groceryCategories.filter((g) => (countByRayon.get(g.key) ?? 0) > 0).length === 0 ? (
              <Text style={{ padding: 16, fontSize: 12, color: colors.inkFaint, textAlign: 'center' }}>Aucun article dans le catalogue.</Text>
            ) : (
              groceryCategories
                .filter((g) => (countByRayon.get(g.key) ?? 0) > 0)
                .map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setOpenRayon(g.key)}
                    style={[styles.row, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1 }]}
                  >
                    <Text style={{ fontSize: 13.5, color: colors.ink }}>
                      {g.icon ? `${g.icon} ` : ''}{g.label}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkFaint }}>{countByRayon.get(g.key)} ›</Text>
                  </Pressable>
                ))
            )}
          </ScrollView>
          <Pressable
            onPress={() => {
              close();
              onCreateNewArticle();
            }}
            style={[styles.createRow, { borderTopColor: colors.line, backgroundColor: colors.sagePale }]}
          >
            <Text style={{ fontSize: 13, fontFamily: fonts.bodySemiBold, color: colors.forestDark }}>+ Créer un article</Text>
          </Pressable>
          <Pressable onPress={close} style={styles.cancelRow}>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 380, maxHeight: '85%', borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: 14.5, fontFamily: fonts.bodySemiBold, padding: 16, paddingBottom: 8 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13.5 },
  row: { paddingVertical: 12, paddingHorizontal: 16 },
  createRow: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1 },
  cancelRow: { paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', alignItems: 'center' },
});
