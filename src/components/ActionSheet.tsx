import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radii } from '../theme/tokens';

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const { colors } = useTheme();

  const choose = (action: ActionSheetAction) => {
    onClose();
    action.onPress();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: colors.paper, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
          {title ? <Text style={[styles.title, { color: colors.inkFaint }]}>{title}</Text> : null}
          {actions.map((action, i) => (
            <Pressable
              key={i}
              onPress={() => choose(action)}
              style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}
            >
              <Text style={{ fontSize: 14, fontFamily: fonts.bodyMedium, color: action.destructive ? '#C0392B' : colors.ink }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={[styles.row, styles.cancelRow, { borderTopColor: colors.line }]}>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.inkFaint }}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 340, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { paddingVertical: 13, paddingHorizontal: 16 },
  cancelRow: { borderTopWidth: 1 },
});
