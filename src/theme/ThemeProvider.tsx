import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bleuColors, darkColors, lightColors, roseColors, ThemeColors } from './tokens';

type ThemePreference = 'light' | 'dark' | 'auto' | 'rose' | 'bleu';
export type TextScale = 1 | 1.15 | 1.3;

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
};

const STORAGE_KEY = 'mijote.theme-preference';
const TEXT_SCALE_KEY = 'mijote.text-scale';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');
  const [textScale, setTextScaleState] = useState<TextScale>(1);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'auto' || stored === 'rose' || stored === 'bleu') {
        setPreferenceState(stored);
      }
    });
    AsyncStorage.getItem(TEXT_SCALE_KEY).then((stored) => {
      const n = Number(stored);
      if (n === 1 || n === 1.15 || n === 1.3) setTextScaleState(n);
    });
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  };

  const setTextScale = (scale: TextScale) => {
    setTextScaleState(scale);
    AsyncStorage.setItem(TEXT_SCALE_KEY, String(scale));
  };

  const isDark = preference === 'auto' ? systemScheme === 'dark' : preference === 'dark';
  const scheme: 'light' | 'dark' = isDark ? 'dark' : 'light';

  const colors = isDark
    ? darkColors
    : preference === 'rose'
      ? roseColors
      : preference === 'bleu'
        ? bleuColors
        : lightColors;

  const value = useMemo(
    () => ({ colors, scheme, preference, setPreference, textScale, setTextScale }),
    [colors, scheme, preference, textScale],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
