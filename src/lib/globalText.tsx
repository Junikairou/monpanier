import React, { forwardRef, useContext } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { TextScaleContext } from '../theme/ThemeProvider';

/**
 * Rend le réglage "Taille du texte" (Profil > Apparence) global à toute
 * l'app sans devoir toucher chaque `fontSize` codé en dur écran par écran :
 * on remplace les exports `Text`/`TextInput` de react-native par des
 * versions qui multiplient le `fontSize` déjà présent dans le style par
 * l'échelle choisie. Doit être importé une seule fois, avant le premier
 * rendu (voir app/_layout.tsx).
 */
function scaleStyle(style: any, scale: number) {
  if (scale === 1) return style;
  const flat = StyleSheet.flatten(style) as { fontSize?: number } | undefined;
  const base = typeof flat?.fontSize === 'number' ? flat.fontSize : 14;
  return [style, { fontSize: base * scale }];
}

const ScaledText = forwardRef<any, React.ComponentProps<typeof RNText>>((props, ref) => {
  const scale = useContext(TextScaleContext);
  return <RNText ref={ref} {...props} style={scaleStyle(props.style, scale)} />;
});
ScaledText.displayName = 'ScaledText';

const ScaledTextInput = forwardRef<any, React.ComponentProps<typeof RNTextInput>>((props, ref) => {
  const scale = useContext(TextScaleContext);
  return <RNTextInput ref={ref} {...props} style={scaleStyle(props.style, scale)} />;
});
ScaledTextInput.displayName = 'ScaledTextInput';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  RN.Text = ScaledText;
  RN.TextInput = ScaledTextInput;
} catch {
  // no-op : si react-native ne peut pas être patché ainsi sur une plateforme
  // donnée, on garde le comportement par défaut (pas de mise à l'échelle).
}
