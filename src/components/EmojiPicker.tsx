import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radii } from '../theme/tokens';

const EMOJIS = [
  '🍽️', '🍳', '🥘', '🍲', '🍛', '🍜', '🍝', '🍕', '🌮', '🌯', '🥗', '🥪', '🍔', '🌭', '🥙',
  '🍣', '🍱', '🥟', '🍤', '🍗', '🍖', '🥩', '🥓', '🍞', '🥐', '🥖', '🧀', '🥞', '🧇', '🍳',
  '🍚', '🍜', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🥧', '🍩', '🍪', '🍫', '🍬',
  '🍭', '🍮', '🍯', '🥣', '🥫', '🥦', '🥕', '🌽', '🥔', '🍅', '🥑', '🍆', '🥒', '🫑', '🧅',
  '🧄', '🥬', '🍄', '🥜', '🌰', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏',
  '🍐', '🍑', '🍒', '🍓', '🥝', '🥥', '🍯', '🥛', '🧃', '🧋', '🍵', '☕', '🍺', '🍷', '🥤',
  '🍽️', '🥄', '🍴', '🔪', '🧂', '📦', '🛒', '🧊', '🍽️', '🥘', '🍱', '🍢', '🥡', '🍙', '🍘',
];

interface EmojiPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ visible, onSelect, onClose }: EmojiPickerProps) {
  const { colors } = useTheme();
  const [custom, setCustom] = useState('');

  const choose = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: colors.paper, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: colors.inkFaint }]}>Choisir un emoji</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            <View style={styles.grid}>
              {EMOJIS.map((e, i) => (
                <Pressable key={`${e}-${i}`} onPress={() => choose(e)} style={styles.cell}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder="Ou tape/colle le tien"
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, { borderColor: colors.beigeDark, color: colors.ink }]}
            />
            <Pressable
              onPress={() => custom.trim() && choose(custom.trim())}
              style={[styles.okBtn, { backgroundColor: colors.forest }]}
            >
              <Text style={{ color: '#FFF', fontSize: 13, fontFamily: fonts.bodySemiBold }}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 360, borderRadius: radii.lg, borderWidth: 1, padding: 16 },
  title: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13 },
  okBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radii.sm },
});
