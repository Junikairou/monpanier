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
  // Une fois qu'on a confirmé vouloir quitter, router.back()/dispatch() redéclenche
  // 'beforeRemove' (le formulaire est toujours "sale" à cet instant) — sans ce
  // verrou, ce second passage interceptait de nouveau la sortie, ce qui obligeait
  // à confirmer une deuxième fois pour que ça marche vraiment.
  const leavingRef = useRef(false);

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove' as any, (e: any) => {
      if (!dirtyRef.current || leavingRef.current) return;
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
      leavingRef.current = true;
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
