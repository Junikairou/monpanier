import { supabase } from '../lib/supabase';
import type { MealSlot } from '../types/models';

export interface Profile {
  id: string;
  display_name: string | null;
  household_size: number;
  language: string;
  units: 'metric' | 'imperial';
  diet: string | null;
  active_slots: MealSlot[];
  onboarded: boolean;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
