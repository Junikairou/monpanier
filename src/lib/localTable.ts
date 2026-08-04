import AsyncStorage from '@react-native-async-storage/async-storage';

// Petit "moteur de table" générique par-dessus AsyncStorage, utilisé
// uniquement par le mode invité (src/data/guestBackend.ts) pour stocker
// plats/planning/courses en local, sans backend.
const PREFIX = 'guest_table_';

export function localUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function readTable<T>(name: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(PREFIX + name);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

export async function writeTable<T>(name: string, rows: T[]): Promise<void> {
  await AsyncStorage.setItem(PREFIX + name, JSON.stringify(rows));
}

/** Efface toutes les données locales du mode invité (plats, planning, courses, profil...). */
export async function clearAllGuestData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const guestKeys = keys.filter((k) => k.startsWith(PREFIX) || k === 'guest_mode_active' || k === 'guest_profile');
  if (guestKeys.length) await AsyncStorage.multiRemove(guestKeys);
}
