import { useRef } from 'react';
import { Platform, ScrollView } from 'react-native';

// À appliquer sur le ScrollView draggé : évite que le clic-glissé sélectionne
// le texte des puces/chips au passage (comportement par défaut du navigateur).
export const noSelectWebStyle = Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab' } as any) : undefined;

// Permet de glisser à la souris (clic-maintenu) pour faire défiler un ScrollView
// horizontal sur PC/web — sur mobile le doigt le fait déjà nativement.
export function useWebHorizontalDrag() {
  const ref = useRef<ScrollView>(null);
  const dragState = useRef({ dragging: false, startX: 0, startScroll: 0 });

  const getScrollNode = (): any => (ref.current as any)?.getScrollableNode?.() ?? (ref.current as any);

  const handlers =
    Platform.OS === 'web'
      ? {
          onMouseDown: (e: any) => {
            const node = getScrollNode();
            if (!node) return;
            dragState.current = { dragging: true, startX: e.pageX, startScroll: node.scrollLeft };
          },
          onMouseMove: (e: any) => {
            if (!dragState.current.dragging) return;
            const node = getScrollNode();
            if (!node) return;
            node.scrollLeft = dragState.current.startScroll - (e.pageX - dragState.current.startX);
          },
          onMouseUp: () => {
            dragState.current.dragging = false;
          },
          onMouseLeave: () => {
            dragState.current.dragging = false;
          },
        }
      : {};

  return { ref, handlers };
}
