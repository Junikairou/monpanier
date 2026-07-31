import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { cardShadow, fonts, radii, spacing } from '../theme/tokens';

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.screen, { backgroundColor: colors.cream }]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderColor: colors.line, backgroundColor: colors.cream }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={[styles.backBtn, { borderColor: colors.beigeDark }]}>
            <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>{title}</Text>
          {subtitle ? <Text style={[styles.headerSub, { color: colors.inkFaint }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
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
    variant === 'primary' ? colors.forest : variant === 'ghost' ? 'transparent' : colors.sagePale;
  const border = variant === 'primary' ? colors.forest : variant === 'ghost' ? colors.beigeDark : 'transparent';
  const textColor =
    variant === 'primary' ? '#FFFFFF' : variant === 'ghost' ? colors.inkSoft : colors.forestDark;
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

export function MiniButton({
  label,
  variant = 'sage',
  onPress,
}: {
  label: string;
  variant?: 'sage' | 'outline';
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.miniBtn,
        variant === 'sage'
          ? { backgroundColor: colors.sagePale, borderColor: 'transparent' }
          : { backgroundColor: 'transparent', borderColor: colors.beigeDark, borderWidth: 1.2 },
      ]}
    >
      <Text style={{ fontSize: 10, fontFamily: fonts.bodyMedium, color: variant === 'sage' ? colors.forestDark : colors.inkSoft }}>
        {label}
      </Text>
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
        { backgroundColor: active ? colors.forest : colors.paper, borderColor: active ? colors.forest : colors.beigeDark },
      ]}
    >
      <Text style={{ color: active ? '#FFFFFF' : colors.inkSoft, fontSize: 11.5, fontFamily: active ? fonts.bodySemiBold : fonts.bodyMedium }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, cardShadow, { backgroundColor: colors.paper, shadowColor: colors.ink }, style]}>
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
      <Text style={[styles.fieldLabel, { color: colors.inkFaint }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkFaint}
        style={[
          styles.input,
          { borderColor: colors.beigeDark, color: colors.ink, backgroundColor: colors.paper },
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
      <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontStyle: 'italic', fontSize: 13 }}>{text}</Text>
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
          borderColor: checked ? colors.forest : colors.beigeDark,
          backgroundColor: checked ? colors.forest : 'transparent',
        },
      ]}
    >
      {checked ? <Text style={{ color: '#FFFFFF', fontSize: 11 }}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 18, borderBottomWidth: 1 },
  backBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 21, fontFamily: fonts.display },
  headerSub: { fontSize: 11.5, marginTop: 2, fontFamily: fonts.body },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillText: { fontSize: 12, fontFamily: fonts.bodySemiBold },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: radii.sm, marginRight: 7, borderWidth: 1.5 },
  card: { borderRadius: radii.md, padding: 13 },
  fieldLabel: { fontSize: 10.5, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.bodySemiBold },
  input: { borderWidth: 1.5, borderRadius: radii.sm, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, fontFamily: fonts.body },
  empty: { paddingVertical: 30, alignItems: 'center' },
  checkbox: { width: 16, height: 16, borderRadius: radii.tag, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  miniBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: radii.btn, alignItems: 'center' },
});
