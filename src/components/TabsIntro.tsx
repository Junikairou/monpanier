import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radii } from '../theme/tokens';

const STORAGE_KEY = 'tabs_intro_dismissed';
const BUBBLE_WIDTH = 232;

interface TabStep {
  icon: string;
  title: string;
  text: string;
}

const STEPS: TabStep[] = [
  { icon: '📅', title: 'Planning', text: "La semaine en cours en un coup d'œil : tes repas prévus, jour par jour." },
  { icon: '🛒', title: 'Courses', text: 'La liste de courses générée automatiquement à partir de ton planning.' },
  { icon: '🍽️', title: 'Plats', text: 'Toutes tes recettes : les consulter, en créer, les modifier.' },
  { icon: '⋯', title: 'Plus', text: 'Ton profil, les réglages, le partage du foyer et la personnalisation.' },
];

export function TabsIntro({ tabBarWidth, bottomInset }: { tabBarWidth: number; bottomInset: number }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [dontRemind, setDontRemind] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v !== '1') setVisible(true);
    });
  }, []);

  if (!visible || tabBarWidth === 0) return null;

  const close = async () => {
    setVisible(false);
    if (dontRemind) await AsyncStorage.setItem(STORAGE_KEY, '1');
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      close();
    } else {
      setStep((s) => s + 1);
    }
  };

  const tabCenterX = (step + 0.5) * (tabBarWidth / STEPS.length);
  const current = STEPS[step];
  const bubbleLeft = Math.min(Math.max(tabCenterX - BUBBLE_WIDTH / 2, 12), tabBarWidth - BUBBLE_WIDTH - 12);
  const arrowLeft = Math.min(Math.max(tabCenterX - 7, 20), tabBarWidth - 34);
  const tabBarTotalHeight = 56 + bottomInset;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.bubble,
            { backgroundColor: colors.paper, borderColor: colors.line, left: bubbleLeft, bottom: tabBarTotalHeight + 14 },
          ]}
        >
          <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink }}>
            {current.icon} {current.title}
          </Text>
          <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 4, lineHeight: 16 }}>{current.text}</Text>

          <Pressable onPress={() => setDontRemind((v) => !v)} style={styles.checkRow} hitSlop={6}>
            <View style={[styles.checkbox, { borderColor: colors.beigeDark, backgroundColor: dontRemind ? colors.forest : 'transparent' }]}>
              {dontRemind ? <Text style={{ color: '#FFF', fontSize: 10 }}>✓</Text> : null}
            </View>
            <Text style={{ fontSize: 10.5, color: colors.inkSoft }}>Ne plus me montrer ça</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 10 }}>
            <Pressable onPress={close} hitSlop={6}>
              <Text style={{ fontSize: 11.5, color: colors.inkFaint }}>Passer</Text>
            </Pressable>
            <Pressable onPress={next} style={[styles.nextBtn, { backgroundColor: colors.forest }]}>
              <Text style={{ fontSize: 11.5, fontFamily: fonts.bodySemiBold, color: '#FFFFFF' }}>
                {step >= STEPS.length - 1 ? "C'est compris" : 'Suivant'}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.arrow, { left: arrowLeft, bottom: tabBarTotalHeight + 6, borderTopColor: colors.paper }]} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  bubble: { position: 'absolute', width: BUBBLE_WIDTH, borderRadius: radii.lg, borderWidth: 1, padding: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  checkbox: { width: 15, height: 15, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
