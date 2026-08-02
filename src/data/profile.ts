import { supabase } from '../lib/supabase';
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

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
