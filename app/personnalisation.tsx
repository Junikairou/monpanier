import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/ScaledText';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';
import { useTaxonomies } from '../src/lib/taxonomies';
import { Card, Pill, Screen, ScreenHeader } from '../src/components/ui';
import { EmojiPicker } from '../src/components/EmojiPicker';
import { TaxonomyItem, TaxonomyKind } from '../src/data/taxonomies';
import { fonts, radii } from '../src/theme/tokens';

const TABS: { key: TaxonomyKind; title: string; hasIcon: boolean }[] = [
  { key: 'category', title: 'Catégories de plat', hasIcon: true },
  { key: 'course_type', title: 'Types de plat', hasIcon: true },
  { key: 'grocery_category', title: 'Rayons (courses)', hasIcon: true },
];

const ROW_HEIGHT = 52;

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === -1) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function Personnalisation() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;
  const taxo = useTaxonomies();

  const [tab, setTab] = useState<TaxonomyKind>('category');
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newIconPickerOpen, setNewIconPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragDy, setDragDy] = useState(0);
  const [baseOrder, setBaseOrder] = useState<TaxonomyItem[]>([]);

  const current = TABS.find((t) => t.key === tab)!;
  const items = tab === 'category' ? taxo.categories : tab === 'course_type' ? taxo.courseTypes : taxo.groceryCategories;

  const baseIndex = dragId ? baseOrder.findIndex((i) => i.id === dragId) : -1;
  const targetIndex = dragId ? Math.min(baseOrder.length - 1, Math.max(0, baseIndex + Math.round(dragDy / ROW_HEIGHT))) : -1;
  const displayOrder = dragId ? moveItem(baseOrder, baseIndex, targetIndex) : items;
  const rowOffset = dragId ? dragDy - (targetIndex - baseIndex) * ROW_HEIGHT : 0;

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

  const startDrag = (id: string) => {
    setBaseOrder(items);
    setDragId(id);
    setDragDy(0);
  };

  const onDragMove = (dy: number) => setDragDy(dy);

  const endDrag = () => {
    if (dragId && baseIndex !== -1 && targetIndex !== baseIndex) {
      taxo.reorder(tab, moveItem(baseOrder, baseIndex, targetIndex).map((i) => i.id));
    }
    setDragId(null);
    setDragDy(0);
  };

  return (
    <Screen>
      <ScreenHeader title="Personnalisation" subtitle="Partagé avec ton foyer — maintiens ☰ pour réordonner" onBack={() => router.back()} />

      <View style={[styles.switchWrap, { backgroundColor: colors.beige }]}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.switchOpt, tab === t.key && { backgroundColor: colors.paper }]} onPress={() => setTab(t.key)}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bodyMedium, color: tab === t.key ? colors.ink : colors.inkSoft, textAlign: 'center' }}>
              {t.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 8 }} scrollEnabled={!dragId}>
        {displayOrder.map((item) => (
          <TaxonomyRow
            key={item.id}
            item={item}
            hasIcon={current.hasIcon}
            dragging={dragId === item.id}
            dragOffset={dragId === item.id ? rowOffset : 0}
            onDragStart={() => startDrag(item.id)}
            onDragMove={onDragMove}
            onDragEnd={endDrag}
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
              <Pressable onPress={() => setNewIconPickerOpen(true)} style={[styles.input, { width: 44, alignItems: 'center', justifyContent: 'center', borderColor: colors.beigeDark }]}>
                <Text style={{ fontSize: 18 }}>{newIcon || '📦'}</Text>
              </Pressable>
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

      <EmojiPicker visible={newIconPickerOpen} onSelect={setNewIcon} onClose={() => setNewIconPickerOpen(false)} />
    </Screen>
  );
}

function TaxonomyRow({
  item,
  hasIcon,
  dragging,
  dragOffset,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRename,
  onDelete,
}: {
  item: TaxonomyItem;
  hasIcon: boolean;
  dragging: boolean;
  dragOffset: number;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
  onRename: (label: string, icon?: string) => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const [label, setLabel] = useState(item.label);
  const [icon, setIcon] = useState(item.icon ?? '');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    setLabel(item.label);
    setIcon(item.icon ?? '');
  }, [item.label, item.icon]);

  const callbacksRef = useRef({ onDragStart, onDragMove, onDragEnd });
  useEffect(() => {
    callbacksRef.current = { onDragStart, onDragMove, onDragEnd };
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => callbacksRef.current.onDragStart(),
      onPanResponderMove: (_e, gesture) => callbacksRef.current.onDragMove(gesture.dy),
      onPanResponderRelease: () => callbacksRef.current.onDragEnd(),
      onPanResponderTerminate: () => callbacksRef.current.onDragEnd(),
    }),
  ).current;

  return (
    <Card
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: ROW_HEIGHT - 16 },
        dragging ? { transform: [{ translateY: dragOffset }], shadowOpacity: 0.25, elevation: 6, zIndex: 10 } : undefined,
      ]}
    >
      <View {...panResponder.panHandlers} hitSlop={8} style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
        <Text style={{ fontSize: 16, color: colors.inkFaint }}>☰</Text>
      </View>
      {hasIcon ? (
        <Pressable onPress={() => setIconPickerOpen(true)} style={[styles.input, { width: 40, alignItems: 'center', justifyContent: 'center', borderColor: colors.beigeDark }]}>
          <Text style={{ fontSize: 16 }}>{icon || '📦'}</Text>
        </Pressable>
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

      <EmojiPicker
        visible={iconPickerOpen}
        onSelect={(e) => {
          setIcon(e);
          onRename(label, e);
        }}
        onClose={() => setIconPickerOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  switchWrap: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 4, borderRadius: radii.sm, padding: 3, gap: 2 },
  switchOpt: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  input: { borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13 },
  removeBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
