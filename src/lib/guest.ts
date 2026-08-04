import AsyncStorage from '@react-native-async-storage/async-storage';

// Mode invité : aucune donnée n'est envoyée à Supabase, tout reste stocké
// localement sur l'appareil (AsyncStorage / localStorage sur web). Un seul
// utilisateur/foyer fictif sert de clé pour toutes les tables locales.
export const GUEST_USER_ID = 'guest-local';
export const GUEST_HOUSEHOLD_ID = 'guest-local-household';

const GUEST_FLAG_KEY = 'guest_mode_active';

let cached: boolean | null = null;

export async function isGuestModeActive(): Promise<boolean> {
  if (cached !== null) return cached;
  const raw = await AsyncStorage.getItem(GUEST_FLAG_KEY);
  cached = raw === 'true';
  return cached;
}

/**
 * Lecture synchrone du mode invité, pour les fonctions data/*.ts qui n'ont
 * pas de userId en paramètre (ex. getDish, listIngredients). Fiable dès que
 * l'app a démarré : AuthProvider résout isGuestModeActive() avant d'afficher
 * quoi que ce soit qui pourrait appeler ces fonctions.
 */
export function isGuestModeSync(): boolean {
  return cached === true;
}

export async function enterGuestMode(): Promise<void> {
  cached = true;
  await AsyncStorage.setItem(GUEST_FLAG_KEY, 'true');
}

export async function exitGuestMode(): Promise<void> {
  cached = false;
  await AsyncStorage.removeItem(GUEST_FLAG_KEY);
}

export function isGuestUserId(userId: string | undefined | null): boolean {
  return userId === GUEST_USER_ID;
}
