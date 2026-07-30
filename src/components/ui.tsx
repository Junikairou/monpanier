import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radii, spacing } from '../theme/tokens';

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.screen, { backgroundColor: colors.cream }]}>{children}</View>;
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderColor: colors.line, backgroundColor: colors.paper }]}>
      <Text style={[styles.headerTitle, { color: colors.ink }]}>{title}</Text>
      {subtitle ? <Text style={[styles.headerSub, { color: colors.inkSoft }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Pill({
  label,
  variant = 'default',
  onPress,
  disabled,
}: {
  label: string;
  variant?: 'default' | 'primary' | 'ghost';
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.forest : variant === 'ghost' ? 'transparent' : colors.paper;
  const border = variant === 'primary' ? colors.forest : colors.line;
  const textColor =
    variant === 'primary' ? colors.paper : variant === 'ghost' ? colors.inkSoft : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.forest : colors.sagePale },
      ]}
    >
      <Text style={{ color: active ? colors.paper : colors.inkSoft, fontSize: 12, fontWeight: active ? '700' : '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line }, style]}>
      {children}
    </View>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & TextInputProps) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing(3) }}>
      <Text style={[styles.fieldLabel, { color: colors.inkSoft }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkSoft}
        style={[
          styles.input,
          { borderColor: colors.line, color: colors.ink, backgroundColor: colors.paper },
        ]}
        {...props}
      />
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={{ color: colors.inkSoft, fontStyle: 'italic', fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export function LoadingBlock() {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.forest} />
    </View>
  );
}

export function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.checkbox,
        {
          borderColor: checked ? colors.forest : colors.sage,
          backgroundColor: checked ? colors.forest : 'transparent',
        },
      ]}
    >
      {checked ? <Text style={{ color: colors.paper, fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 18, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '600', fontStyle: 'italic' },
  headerSub: { fontSize: 12, marginTop: 2 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: radii.pill, marginRight: 7 },
  card: { borderRadius: radii.md, borderWidth: 1, padding: 13 },
  fieldLabel: { fontSize: 11, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: radii.sm, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  empty: { paddingVertical: 30, alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
