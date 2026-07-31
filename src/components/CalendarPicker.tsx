import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { addDays, addMonths, formatMonthYear, isToday, startOfMonth, startOfWeek, toIso } from '../lib/dates';
import { fonts, radii } from '../theme/tokens';

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

export function CalendarPicker({ visible, selectedDate, onSelect, onClose }: CalendarPickerProps) {
  const { colors } = useTheme();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date(selectedDate)));

  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const choose = (d: Date) => {
    onSelect(toIso(d));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: colors.paper, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable onPress={() => setViewMonth((m) => addMonths(m, -1))} hitSlop={8} style={[styles.arrowBtn, { backgroundColor: colors.cream, borderColor: colors.beige }]}>
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>‹</Text>
            </Pressable>
            <Text style={{ fontSize: 14, fontFamily: fonts.bodySemiBold, color: colors.ink }}>{formatMonthYear(viewMonth)}</Text>
            <Pressable onPress={() => setViewMonth((m) => addMonths(m, 1))} hitSlop={8} style={[styles.arrowBtn, { backgroundColor: colors.cream, borderColor: colors.beige }]}>
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_HEADERS.map((w, i) => (
              <Text key={i} style={[styles.weekdayLabel, { color: colors.inkFaint }]}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d) => {
              const iso = toIso(d);
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const selected = iso === selectedDate;
              const today = isToday(d);
              return (
                <Pressable
                  key={iso}
                  onPress={() => choose(d)}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: selected ? colors.forest : 'transparent',
                      borderColor: today && !selected ? colors.forest : 'transparent',
                      borderWidth: today && !selected ? 1.5 : 0,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontFamily: fonts.bodyMedium,
                      color: selected ? colors.paper : inMonth ? colors.ink : colors.inkFaint,
                      opacity: inMonth ? 1 : 0.4,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => choose(new Date())} style={[styles.todayBtn, { borderColor: colors.beige }]}>
            <Text style={{ fontSize: 12, color: colors.forest, fontFamily: fonts.bodyMedium }}>Aujourd'hui</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 340, borderRadius: radii.lg, borderWidth: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  arrowBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 10, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  todayBtn: { marginTop: 12, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1 },
});
