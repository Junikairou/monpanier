import { useEffect, useRef, useState } from 'react';
import { useNavigation } from 'expo-router';

export function useUnsavedChangesGuard(dirty: boolean) {
  const navigation = useNavigation();
  const [pendingAction, setPendingAction] = useState<any>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove' as any, (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      setPendingAction(e.data.action);
    });
    return sub;
  }, [navigation]);

  return {
    visible: pendingAction !== null,
    confirmLeave: () => {
      const action = pendingAction;
      setPendingAction(null);
      // Pour un simple retour (l'immense majorité des cas), navigation.goBack()
      // est plus fiable que rejouer l'action capturée par 'beforeRemove' (qui a pu
      // atterrir sur le mauvais écran sur certaines plateformes) ; on ne rejoue
      // l'action capturée que pour les cas différents d'un simple retour (ex. appui
      // sur un onglet), où c'est la seule façon de retrouver la bonne destination.
      if (action && action.type !== 'GO_BACK' && action.type !== 'POP') {
        navigation.dispatch(action);
      } else {
        navigation.goBack();
      }
    },
    cancelLeave: () => setPendingAction(null),
  };
}
