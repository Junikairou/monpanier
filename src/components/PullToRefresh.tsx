import React, { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from './ScaledText';
import { useTheme } from '../theme/ThemeProvider';

const THRESHOLD = 64;

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  scrollOffsetRef: React.MutableRefObject<number>;
  children: React.ReactNode;
}

// react-native-web n'implémente pas le geste natif "tirer pour actualiser" des
// RefreshControl (utile uniquement sur natif) : on le recrée à la main pour le web,
// en s'appuyant sur les événements tactiles bruts plutôt que PanResponder (plus fiable
// sur navigateur), activé seulement quand la liste est déjà tout en haut.
export function PullToRefresh({ onRefresh, scrollOffsetRef, children }: PullToRefreshProps) {
  const { colors } = useTheme();
  const [dragY, setDragY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const onTouchStart = (e: any) => {
    if (scrollOffsetRef.current > 2 || refreshing) return;
    startY.current = e.nativeEvent.touches[0].pageY;
    dragging.current = true;
  };

  const onTouchMove = (e: any) => {
    if (!dragging.current || startY.current === null) return;
    if (scrollOffsetRef.current > 2) {
      dragging.current = false;
      setDragY(0);
      return;
    }
    const dy = e.nativeEvent.touches[0].pageY - startY.current;
    setDragY(dy > 0 ? Math.min(dy * 0.5, 90) : 0);
  };

  const endDrag = () => {
    if (dragging.current && dragY > THRESHOLD) {
      setRefreshing(true);
      Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false);
        setDragY(0);
      });
    } else {
      setDragY(0);
    }
    dragging.current = false;
    startY.current = null;
  };

  const indicatorHeight = refreshing ? 40 : dragY;

  return (
    <View style={{ flex: 1 }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={endDrag} onTouchCancel={endDrag}>
      {indicatorHeight > 2 ? (
        <View style={{ height: indicatorHeight, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <Text
            style={{
              fontSize: 15,
              color: colors.forest,
              transform: refreshing ? undefined : [{ rotate: `${Math.min(dragY / THRESHOLD, 1) * 180}deg` }],
            }}
          >
            {refreshing ? '↻ Actualisation…' : dragY > THRESHOLD ? '↑ Relâcher pour actualiser' : '↓'}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}
