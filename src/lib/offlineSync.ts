import { useEffect } from 'react';
import { applyQueuedGroceryAction } from '../data/groceries';
import { flushQueue, isOnline, onConnectivityChange } from './offlineStore';

async function flush(): Promise<void> {
  if (!isOnline()) return;
  await flushQueue((action) => applyQueuedGroceryAction(action.type, action.payload));
}

// Rejoue les actions faites hors ligne (ex. cocher des articles au
// supermarché) dès que la connexion revient, et une fois au démarrage.
export function useOfflineSync(): void {
  useEffect(() => {
    flush();
    return onConnectivityChange((online) => {
      if (online) flush();
    });
  }, []);
}
