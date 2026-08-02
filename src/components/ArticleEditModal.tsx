import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radii } from '../theme/tokens';
import { ActionSheet } from './ActionSheet';
import { CatalogIngredient, CatalogIngredientPatch } from '../data/ingredientsCatalog';
import { TaxonomyItem } from '../data/taxonomies';

interface ArticleEditModalProps {
  visible: boolean;
  item: CatalogIngredient | null;
  initialName?: string;
  groceryCategories: TaxonomyItem[];
  showNutrition: boolean;
  onSave: (patch: CatalogIngredientPatch) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onClose: () => void;
}

export function ArticleEditModal({
  visible,
  item,
  initialName,
  groceryCategories,
  showNutrition,
  onSave,
  onDelete,
  onClose,
}: ArticleEditModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [rayon, setRayon] = useState('autre');
  const [rayonMenuOpen, setRayonMenuOpen] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(item?.name ?? initialName ?? '');
    setRayon(item?.grocery_category ?? 'autre');
    setCalories(item?.calories != null ? String(item.calories) : '');
    setProtein(item?.protein_g != null ? String(item.protein_g) : '');
    setCarbs(item?.carbs_g != null ? String(item.carbs_g) : '');
    setFat(item?.fat_g != null ? String(item.fat_g) : '');
    setFiber(item?.fiber_g != null ? String(item.fiber_g) : '');
  }, [visible, item, initialName]);

  const rayonLabel = groceryCategories.find((g) => g.key === rayon);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        grocery_category: rayon,
        calories: calories.trim() ? Number(calories.replace(',', '.')) || null : null,
        protein_g: protein.trim() ? Number(protein.replace(',', '.')) || null : null,
        carbs_g: carbs.trim() ? Number(carbs.replace(',', '.')) || null : null,
        fat_g: fat.trim() ? Number(fat.replace(',', '.')) || null : null,
        fiber_g: fiber.trim() ? Number(fiber.replace(',', '.')) || null : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!onDelete) return;
    const message = `Supprimer l'article "${name}" ? Il ne sera plus proposé dans les recettes.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) onDelete();
      return;
    }
    Alert.alert('Supprimer cet article ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: colors.paper, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={{ padding: 18 }}>
            <Text style={[styles.title, { color: colors.ink }]}>{item ? "Modifier l'article" : 'Nouvel article'}</Text>

            <Text style={[styles.label, { color: colors.inkSoft }]}>Nom</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex. Riz basmati"
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
            />

            <Text style={[styles.label, { color: colors.inkSoft, marginTop: 12 }]}>Rayon</Text>
            <Pressable onPress={() => setRayonMenuOpen(true)} style={[styles.dropdown, { borderColor: colors.beigeDark }]}>
              <Text style={{ fontSize: 13, color: colors.ink }}>
                {rayonLabel ? `${rayonLabel.icon ?? ''} ${rayonLabel.label}`.trim() : 'Choisir'}
              </Text>
              <Text style={{ color: colors.inkSoft }}>▾</Text>
            </Pressable>

            {showNutrition ? (
              <>
                <Text style={[styles.label, { color: colors.inkSoft, marginTop: 12 }]}>Calories (pour 100 g, optionnel)</Text>
                <TextInput
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  placeholder="Ex. 130"
                  placeholderTextColor={colors.inkFaint}
                  style={[styles.input, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
                />
                <Text style={[styles.label, { color: colors.inkSoft, marginTop: 12 }]}>Nutriments (pour 100 g, optionnel)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={protein}
                      onChangeText={setProtein}
                      keyboardType="numeric"
                      placeholder="Prot. g"
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.input, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={carbs}
                      onChangeText={setCarbs}
                      keyboardType="numeric"
                      placeholder="Gluc. g"
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.input, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={fat}
                      onChangeText={setFat}
                      keyboardType="numeric"
                      placeholder="Lip. g"
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.input, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={fiber}
                      onChangeText={setFiber}
                      keyboardType="numeric"
                      placeholder="Fibres g"
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.input, { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.cream }]}
                    />
                  </View>
                </View>
              </>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <Pressable onPress={save} disabled={saving || !name.trim()} style={[styles.saveBtn, { backgroundColor: colors.forest, opacity: saving || !name.trim() ? 0.6 : 1 }]}>
                <Text style={{ color: '#FFF', fontSize: 13.5, fontFamily: fonts.bodySemiBold }}>{saving ? '…' : 'Enregistrer'}</Text>
              </Pressable>
              <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.beigeDark }]}>
                <Text style={{ color: colors.inkSoft, fontSize: 13.5 }}>Annuler</Text>
              </Pressable>
            </View>
            {onDelete ? (
              <Pressable onPress={confirmDelete} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.danger, fontSize: 12.5 }}>Supprimer cet article</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>

      <ActionSheet
        visible={rayonMenuOpen}
        title="Rayon"
        actions={groceryCategories.map((g) => ({ label: `${g.icon ?? ''} ${g.label}`.trim(), onPress: () => setRayon(g.key) }))}
        onClose={() => setRayonMenuOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 380, maxHeight: '85%', borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: 14.5, fontFamily: fonts.bodySemiBold, marginBottom: 10 },
  label: { fontSize: 10.5, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.bodySemiBold },
  input: { borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 10, paddingHorizontal: 12 },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: radii.btn, alignItems: 'center' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radii.btn, alignItems: 'center', borderWidth: 1.5 },
});
