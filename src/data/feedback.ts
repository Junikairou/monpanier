import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';

export interface FeedbackEntry {
  id: string;
  message: string;
  created_at: string;
}

export async function listMyFeedback(): Promise<FeedbackEntry[]> {
  const { data, error } = await supabase.from('feedback').select('id, message, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data as FeedbackEntry[];
}

export async function sendFeedback(userId: string, message: string): Promise<void> {
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase.from('feedback').insert({ user_id: userId, household_id, message: message.trim() });
  if (error) throw error;
}
