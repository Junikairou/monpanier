import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/ScaledText';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { useTaxonomies } from '../src/lib/taxonomies';
import { Card, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { TaxonomyItem, TaxonomyKind } from '../src/data/taxonomies';
import { fonts, radii } from '../src/theme/tokens';

const TABS: { key: TaxonomyKind; title: string; hasIcon: boolean }[] = [
  { key: 'category', title: 'Catégories de plat', hasIcon: true },
  { key: 'course_type', title: 'Types de plat', hasIcon: true },
  { key: 'grocery_category', title: 'Rayons (courses)', hasIcon: true },
];

export default function Personnalisation() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const taxo = useTaxonomies();

  const [tab, setTab] = useState<TaxonomyKind>('category');
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [busy, setBusy] = useState(false);

  const current = TABS.find((t) => t.key === tab)!;
  const items = tab === 'category' ? taxo.categories : tab === 'course_type' ? taxo.courseTypes : taxo.groceryCategories;

  const confirmDelete = (item: TaxonomyItem) => {
    const message = `Les plats existants utilisant "${item.label}" garderont leur ancienne valeur affichée telle quelle.`;
    const run = () => taxo.remove(tab, item.id);
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer "${item.label}" ?\n${message}`)) run();
      return;
    }
    Alert.alert(`Supprimer "${item.label}" ?`, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: run },
    ]);
  };

  const addItem = async () => {
    if (!newLabel.trim()) return;
    setBusy(true);
    try {
      await taxo.create(tab, newLabel.trim(), current.hasIcon ? newIcon : undefined);
      setNewLabel('');
      setNewIcon('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Personnalisation" subtitle="Partagé avec ton foyer" onBack={() => router.back()} />

      <View style={[styles.switchWrap, { backgroundColor: colors.beige }]}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.switchOpt, tab === t.key && { backgroundColor: colors.paper }]} onPress={() => setTab(t.key)}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyMedium, color: tab === t.key ? colors.ink : colors.inkSoft, textAlign: 'center' }}>
              {t.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 8 }}>
        {items.map((item, idx) => (
          <TaxonomyRow
            key={item.id}
            item={item}
            hasIcon={current.hasIcon}
            canMoveUp={idx > 0}
            canMoveDown={idx < items.length - 1}
            onMove={(dir) => taxo.move(tab, item.id, dir)}
            onRename={(label, icon) => taxo.rename(tab, item.id, label, icon)}
            onDelete={() => confirmDelete(item)}
          />
        ))}

        <Card style={{ marginTop: 8, gap: 8 }}>
          <Text style={{ fontSize: 11, color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Ajouter {current.title.toLowerCase()}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {current.hasIcon ? (
              <TextInput
                value={newIcon}
                onChangeText={setNewIcon}
                placeholder="📦"
                placeholderTextColor={colors.inkFaint}
                style={[styles.input, { width: 44, textAlign: 'center', color: colors.ink, borderColor: colors.beigeDark }]}
              />
            ) : null}
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="Nom"
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, { flex: 1, color: colors.ink, borderColor: colors.beigeDark }]}
            />
            <Pill label={busy ? '…' : '+ Ajouter'} variant="primary" disabled={busy || !newLabel.trim()} onPress={addItem} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function TaxonomyRow({
  item,
  hasIcon,
  canMoveUp,
  canMoveDown,
  onMove,
  onRename,
  onDelete,
}: {
  item: TaxonomyItem;
  hasIcon: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: 'up' | 'down') => void;
  onRename: (label: string, icon?: string) => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const [label, setLabel] = useState(item.label);
  const [icon, setIcon] = useState(item.icon ?? '');

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ gap: 2 }}>
        <Pressable onPress={() => onMove('up')} disabled={!canMoveUp} hitSlop={4}>
          <Text style={{ fontSize: 12, color: canMoveUp ? colors.forest : colors.line }}>▲</Text>
        </Pressable>
        <Pressable onPress={() => onMove('down')} disabled={!canMoveDown} hitSlop={4}>
          <Text style={{ fontSize: 12, color: canMoveDown ? colors.forest : colors.line }}>▼</Text>
        </Pressable>
      </View>
      {hasIcon ? (
        <TextInput
          value={icon}
          onChangeText={setIcon}
          onBlur={() => icon !== (item.icon ?? '') && onRename(label, icon)}
          style={[styles.input, { width: 40, textAlign: 'center', color: colors.ink, borderColor: colors.beigeDark }]}
        />
      ) : null}
      <TextInput
        value={label}
        onChangeText={setLabel}
        onBlur={() => label.trim() && label !== item.label && onRename(label, hasIcon ? icon : undefined)}
        style={[styles.input, { flex: 1, color: colors.ink, borderColor: colors.beigeDark }]}
      />
      <Pressable onPress={onDelete} hitSlop={8} style={[styles.removeBtn, { backgroundColor: colors.cream, borderColor: colors.beige }]}>
        <Text style={{ color: colors.inkFaint, fontSize: 11 }}>✕</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  switchWrap: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 4, borderRadius: radii.sm, padding: 3, gap: 2 },
  switchOpt: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  input: { borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13 },
  removeBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
