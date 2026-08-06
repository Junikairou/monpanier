import React from 'react';
import { Image, View } from 'react-native';
import { Text } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';

interface DishThumbProps {
  imageUrl?: string | null;
  emoji?: string | null;
  /** Côté de la vignette en px (carré). */
  size?: number;
  /** Arrondi ; par défaut un quart de la taille. */
  radius?: number;
}

/**
 * Vignette d'un plat : sa photo si elle existe, sinon son emoji (l'emoji reste
 * le repli pour toutes les recettes sans photo).
 */
export function DishThumb({ imageUrl, emoji, size = 34, radius }: DishThumbProps) {
  const { colors } = useTheme();
  const r = radius ?? Math.round(size / 4);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.sagePale }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: Math.round(size * 0.62) }}>{emoji || '🍽️'}</Text>
    </View>
  );
}
