import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CACHE_PREFIX = 'offline_cache_';
const QUEUE_KEY = 'offline_write_queue';

export function isOnline(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  const onOnline = () => cb(true);
  const onOffline = () => cb(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
}

// File d'attente d'écritures faites hors connexion : chaque action porte un
// type (interprété par le flusher fourni par l'appelant) et un payload brut.
export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
}

async function readQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueAction(type: string, payload: any): Promise<void> {
  const queue = await readQueue();
  queue.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, type, payload, createdAt: new Date().toISOString() });
  await writeQueue(queue);
}

export async function queueLength(): Promise<number> {
  return (await readQueue()).length;
}

// Rejoue la file dans l'ordre via `apply(action)` (fourni par l'appelant, qui
// sait comment traduire chaque type d'action en appel Supabase). Une action
// qui échoue encore (ex. toujours hors ligne) reste en tête de file, les
// suivantes ne sont pas tentées pour garder l'ordre.
export async function flushQueue(apply: (action: QueuedAction) => Promise<void>): Promise<void> {
  const queue = await readQueue();
  let i = 0;
  for (; i < queue.length; i++) {
    try {
      await apply(queue[i]);
    } catch {
      break;
    }
  }
  await writeQueue(queue.slice(i));
}
