import { supabase } from '../lib/supabase';
import { isGuestUserId } from '../lib/guest';
import * as guest from './guestBackend';
import type { MealSlot } from '../types/models';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  household_id: string;
  household_size: number;
  language: string;
  units: 'metric' | 'imperial';
  diet: string | null;
  active_slots: MealSlot[];
  onboarded: boolean;
  show_balance_hint: boolean;
  show_nutrition_fields: boolean;
  /** Identifiant public façon Discord : Pseudo#1234 (migration 025). */
  tag: string | null;
}

export async function getProfile(userId: string): Promise<Profile> {
  if (isGuestUserId(userId)) return guest.getProfile();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function getDisplayNamesByIds(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data as { id: string; display_name: string | null }[]) {
    if (row.display_name) map[row.id] = row.display_name;
  }
  return map;
}

// Colonnes de confort : si elles manquent en base (migration jamais exécutée),
// l'app doit continuer à fonctionner au lieu de bloquer l'utilisateur. Les
// colonnes hors de cette liste restent obligatoires — une absence y serait un
// vrai problème, qu'il vaut mieux voir remonter.
const OPTIONAL_PROFILE_COLUMNS = [
  'show_balance_hint',
  'show_nutrition_fields',
  'theme_preference',
  'phone',
  'avatar_url',
  'diet',
  'tag',
];

/** Nom de colonne cité par Postgres/PostgREST dans une erreur de colonne absente. */
function missingColumnFrom(error: { message?: string; code?: string } | null): string | null {
  const message = error?.message ?? '';
  // PostgREST : « Could not find the 'x' column of 'profiles' in the schema cache »
  // Postgres 42703 : « column "x" of relation "profiles" does not exist »
  const match = message.match(/'([a-z_]+)' column/i) ?? message.match(/column "([a-z_]+)"/i);
  return match ? match[1] : null;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  if (isGuestUserId(userId)) return guest.updateProfile(patch);

  let payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  // Une colonne manquante peut en cacher une autre : on réessaie tant qu'il
  // reste des champs facultatifs à retirer, sans jamais boucler indéfiniment.
  for (let attempt = 0; attempt <= OPTIONAL_PROFILE_COLUMNS.length; attempt += 1) {
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (!error) return;

    const missing = missingColumnFrom(error);
    if (!missing || !OPTIONAL_PROFILE_COLUMNS.includes(missing) || !(missing in payload)) {
      throw error;
    }
    console.warn(
      `[Mon Panier] Colonne "${missing}" absente de la table profiles : préférence non enregistrée ` +
        `(migration SQL correspondante jamais exécutée). Le reste est bien sauvegardé.`,
    );
    const { [missing]: _removed, ...rest } = payload;
    payload = rest;
  }
}
