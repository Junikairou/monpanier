import { supabase } from '../lib/supabase';

export interface HouseholdMember {
  user_id: string;
  joined_at: string;
}

const householdIdCache = new Map<string, string>();

export async function getMyHouseholdId(userId: string): Promise<string> {
  const cached = householdIdCache.get(userId);
  if (cached) return cached;
  const { data, error } = await supabase.from('profiles').select('household_id').eq('id', userId).single();
  if (error) throw error;
  householdIdCache.set(userId, data.household_id as string);
  return data.household_id as string;
}

export function clearHouseholdCache(userId: string): void {
  householdIdCache.delete(userId);
}

export async function listHouseholdMembers(): Promise<HouseholdMember[]> {
  const { data, error } = await supabase.from('household_members').select('user_id, joined_at').order('joined_at');
  if (error) throw error;
  return data as HouseholdMember[];
}

export async function createHouseholdInvite(): Promise<string> {
  const { data, error } = await supabase.rpc('create_household_invite');
  if (error) throw error;
  return data as string;
}

export async function joinHouseholdWithCode(userId: string, code: string): Promise<void> {
  const { error } = await supabase.rpc('join_household_with_code', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  clearHouseholdCache(userId);
}
