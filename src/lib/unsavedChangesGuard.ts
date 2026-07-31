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
      if (action) navigation.dispatch(action);
    },
    cancelLeave: () => setPendingAction(null),
  };
}
