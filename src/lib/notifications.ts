import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ENABLED_KEY = 'notif_enabled';
const TIMES_KEY = 'notif_meal_times'; // { [mealSlotKey]: "HH:mm" }
const FIRED_KEY = 'notif_fired'; // { [`${date}_${slot}`]: true }

export type MealTimes = Record<string, string>;

export async function getNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
}

export async function getMealTimes(): Promise<MealTimes> {
  const raw = await AsyncStorage.getItem(TIMES_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function setMealTime(slotKey: string, time: string | null): Promise<void> {
  const times = await getMealTimes();
  if (time) times[slotKey] = time;
  else delete times[slotKey];
  await AsyncStorage.setItem(TIMES_KEY, JSON.stringify(times));
}

// Le navigateur ne supporte pas de notification programmée en arrière-plan
// sans backend de push — cette permission ne fonctionne que si l'onglet de
// l'app reste ouvert (voir useMealReminders).
export function notificationsSupported(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const result = await (window as any).Notification.requestPermission();
  return result === 'granted';
}

async function alreadyFiredToday(key: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(FIRED_KEY);
  const fired = raw ? JSON.parse(raw) : {};
  return !!fired[key];
}

async function markFired(key: string): Promise<void> {
  const raw = await AsyncStorage.getItem(FIRED_KEY);
  const fired = raw ? JSON.parse(raw) : {};
  fired[key] = true;
  // Purge les entrées d'avant-hier pour ne pas grossir indéfiniment.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 2);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  for (const k of Object.keys(fired)) {
    if (k.slice(0, 10) < cutoffIso) delete fired[k];
  }
  await AsyncStorage.setItem(FIRED_KEY, JSON.stringify(fired));
}

export function fireReminder(title: string, body: string): void {
  if (!notificationsSupported()) return;
  if ((window as any).Notification.permission !== 'granted') return;
  new (window as any).Notification(title, { body, icon: undefined });
}

export async function maybeFireReminder(dateIso: string, slotKey: string, title: string, body: string): Promise<void> {
  const key = `${dateIso}_${slotKey}`;
  if (await alreadyFiredToday(key)) return;
  fireReminder(title, body);
  await markFired(key);
}
