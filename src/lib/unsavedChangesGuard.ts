import { useEffect, useRef, useState } from 'react';
import { useNavigation, useRouter } from 'expo-router';

export function useUnsavedChangesGuard(dirty: boolean) {
  const navigation = useNavigation();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  // Filet de secours pour un retour capturé par 'beforeRemove' (geste natif,
  // bouton retour matériel) plutôt que par le bouton retour de l'écran.
  const [pendingAction, setPendingAction] = useState<any>(null);

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove' as any, (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      setPendingAction(e.data.action);
      setVisible(true);
    });
    return sub;
  }, [navigation]);

  // Le bouton retour de l'écran appelle CETTE fonction (au lieu de router.back()
  // directement) : si le formulaire est modifié, on affiche la confirmation ;
  // sinon on part directement. Beaucoup plus fiable que d'intercepter et rejouer
  // une action de navigation capturée après coup, qui pouvait ne rien faire ou
  // atterrir au mauvais endroit.
  const attemptBack = () => {
    if (dirtyRef.current) {
      setPendingAction(null);
      setVisible(true);
    } else {
      router.back();
    }
  };

  return {
    visible,
    attemptBack,
    confirmLeave: () => {
      const action = pendingAction;
      setVisible(false);
      setPendingAction(null);
      if (action) {
        navigation.dispatch(action);
      } else {
        router.back();
      }
    },
    cancelLeave: () => {
      setVisible(false);
      setPendingAction(null);
    },
  };
}
