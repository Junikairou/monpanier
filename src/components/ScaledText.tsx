import React, { forwardRef, useContext } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { TextScaleContext } from '../theme/ThemeProvider';

/**
 * Remplacements de `Text`/`TextInput` qui appliquent le réglage "Taille du
 * texte" (Profil > Apparence) à toute l'app. Un patch global (mutation du
 * module react-native) ne fonctionne pas de façon fiable selon le bundler,
 * donc chaque écran importe `Text`/`TextInput` depuis ce fichier au lieu de
 * 'react-native' directement.
 */
function scaleStyle(style: any, scale: number) {
  if (scale === 1) return style;
  const flat = StyleSheet.flatten(style) as { fontSize?: number } | undefined;
  const base = typeof flat?.fontSize === 'number' ? flat.fontSize : 14;
  return [style, { fontSize: base * scale }];
}

export const Text = forwardRef<any, React.ComponentProps<typeof RNText>>((props, ref) => {
  const scale = useContext(TextScaleContext);
  return <RNText ref={ref} {...props} style={scaleStyle(props.style, scale)} />;
});
Text.displayName = 'ScaledText';

export const TextInput = forwardRef<any, React.ComponentProps<typeof RNTextInput>>((props, ref) => {
  const scale = useContext(TextScaleContext);
  return <RNTextInput ref={ref} {...props} style={scaleStyle(props.style, scale)} />;
});
TextInput.displayName = 'ScaledTextInput';
