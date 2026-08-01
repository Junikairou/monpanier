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
  onClose: () => void;
}

export function IngredientPicker({ visible, items, groceryCategories, onSelect, onCreateNew, onClose }: IngredientPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const grouped = useMemo(() => {
    const byRayon = new Map<string, CatalogIngredient[]>();
    for (const item of filtered) {
      const list = byRayon.get(item.grocery_category) ?? [];
      list.push(item);
      byRayon.set(item.grocery_category, list);
    }
    return groceryCategories
      .map((g) => ({ rayon: g, items: byRayon.get(g.key) ?? [] }))
      .filter((s) => s.items.length > 0);
  }, [filtered, groceryCategories]);

  const exactMatch = filtered.some((i) => i.name.toLowerCase() === query.trim().toLowerCase());

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.panel, { backgroundColor: colors.paper, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: colors.ink }]}>Choisir un article</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un article..."
            placeholderTextColor={colors.inkFaint}
            style={[styles.search, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
            autoFocus
          />
          <ScrollView style={{ maxHeight: 340 }}>
            {query.trim() && !exactMatch ? (
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
            {grouped.length === 0 && !query.trim() ? (
              <Text style={{ padding: 16, fontSize: 12, color: colors.inkFaint, textAlign: 'center' }}>Aucun article dans le catalogue.</Text>
            ) : null}
            {grouped.map((section) => (
              <View key={section.rayon.id}>
                <Text style={[styles.sectionTitle, { color: colors.inkFaint, backgroundColor: colors.cream }]}>
                  {section.rayon.icon ? `${section.rayon.icon} ` : ''}{section.rayon.label}
                </Text>
                {section.items.map((item) => (
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
              </View>
            ))}
          </ScrollView>
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
  panel: { width: '100%', maxWidth: 380, maxHeight: '80%', borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: 14.5, fontFamily: fonts.bodySemiBold, padding: 16, paddingBottom: 8 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13.5 },
  sectionTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.bodySemiBold, paddingHorizontal: 16, paddingVertical: 6 },
  row: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelRow: { paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', alignItems: 'center' },
});
