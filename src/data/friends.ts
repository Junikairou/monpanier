import { supabase } from '../lib/supabase';
import { getMyHouseholdId } from './household';
import type { Dish, MealSlot } from '../types/models';

export interface FriendProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  /** Identifiant de la ligne d'amitié, pour retirer/accepter. */
  friendshipId: string;
}

export interface FriendRequests {
  incoming: FriendProfile[];
  outgoing: FriendProfile[];
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
}

/** "Marie#0421" → { name: 'Marie', tag: '0421' } ; null si mal formé. */
export function parseFriendTag(input: string): { name: string; tag: string } | null {
  const match = input.trim().match(/^(.+)#(\d{1,4})$/);
  if (!match) return null;
  return { name: match[1].trim(), tag: match[2].padStart(4, '0') };
}

export function formatFriendTag(displayName: string | null, tag: string | null): string {
  return `${displayName || 'Sans pseudo'}#${tag ?? '????'}`;
}

async function profilesByIds(ids: string[]): Promise<Map<string, { display_name: string | null; avatar_url: string | null }>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids);
  if (error) throw error;
  return new Map((data ?? []).map((p: any) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]));
}

async function listFriendships(): Promise<FriendshipRow[]> {
  const { data, error } = await supabase.from('friendships').select('id, requester_id, addressee_id, status');
  if (error) throw error;
  return (data ?? []) as FriendshipRow[];
}

export async function listFriends(userId: string): Promise<FriendProfile[]> {
  const rows = (await listFriendships()).filter((r) => r.status === 'accepted');
  const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
  const profiles = await profilesByIds(otherIds);
  return rows.map((r) => {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    const p = profiles.get(otherId);
    return { id: otherId, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null, friendshipId: r.id };
  });
}

export async function listFriendRequests(userId: string): Promise<FriendRequests> {
  const rows = (await listFriendships()).filter((r) => r.status === 'pending');
  const ids = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
  const profiles = await profilesByIds(ids);
  const toProfile = (r: FriendshipRow, otherId: string): FriendProfile => {
    const p = profiles.get(otherId);
    return { id: otherId, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null, friendshipId: r.id };
  };
  return {
    incoming: rows.filter((r) => r.addressee_id === userId).map((r) => toProfile(r, r.requester_id)),
    outgoing: rows.filter((r) => r.requester_id === userId).map((r) => toProfile(r, r.addressee_id)),
  };
}

/** Envoie une demande d'ami à partir d'un identifiant "Pseudo#1234". */
export async function sendFriendRequest(userId: string, fullTag: string): Promise<void> {
  const parsed = parseFriendTag(fullTag);
  if (!parsed) throw new Error("Format attendu : Pseudo#1234");

  const { data, error } = await supabase.rpc('find_profile_by_tag', { p_name: parsed.name, p_tag: parsed.tag });
  if (error) throw error;
  const target = (data as any[])?.[0];
  if (!target) throw new Error("Personne trouvée avec cet identifiant.");

  // Si cette personne m'a déjà envoyé une demande, on l'accepte au lieu d'en créer une seconde.
  const existing = (await listFriendships()).find(
    (r) => (r.requester_id === target.id && r.addressee_id === userId) || (r.requester_id === userId && r.addressee_id === target.id),
  );
  if (existing) {
    if (existing.status === 'accepted') throw new Error('Vous êtes déjà amis.');
    if (existing.addressee_id === userId) return acceptFriendRequest(existing.id);
    throw new Error('Demande déjà envoyée, en attente de réponse.');
  }

  const { error: insertErr } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: target.id, status: 'pending' });
  if (insertErr) throw insertErr;
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  if (error) throw error;
}

/** Sert aussi bien à refuser une demande qu'à retirer un ami. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Recettes envoyées à un ami
// ---------------------------------------------------------------------------

export interface ReceivedRecipe {
  id: string;
  dish: Dish;
  fromName: string;
}

export async function shareDishWithFriend(userId: string, dishId: string, friendId: string): Promise<void> {
  const { error } = await supabase
    .from('recipe_shares')
    .upsert({ dish_id: dishId, from_user_id: userId, to_user_id: friendId }, { onConflict: 'dish_id,from_user_id,to_user_id' });
  if (error) throw error;
}

export async function listReceivedRecipes(): Promise<ReceivedRecipe[]> {
  const { data, error } = await supabase
    .from('recipe_shares')
    .select('id, from_user_id, dish:dishes(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const names = await profilesByIds(Array.from(new Set(rows.map((r) => r.from_user_id))));
  return rows
    .filter((r) => r.dish)
    .map((r) => ({ id: r.id, dish: r.dish as Dish, fromName: names.get(r.from_user_id)?.display_name ?? 'Un ami' }));
}

export async function dismissReceivedRecipe(shareId: string): Promise<void> {
  const { error } = await supabase.from('recipe_shares').delete().eq('id', shareId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Invitations à un repas
// ---------------------------------------------------------------------------

export interface MealInvite {
  id: string;
  household_id: string;
  date: string;
  slot: MealSlot;
  fromName: string;
}

export async function inviteFriendToMeal(
  userId: string,
  friendId: string,
  date: string,
  slot: MealSlot,
): Promise<void> {
  const household_id = await getMyHouseholdId(userId);
  const { error } = await supabase
    .from('meal_invites')
    .upsert(
      { household_id, date, slot, from_user_id: userId, to_user_id: friendId },
      { onConflict: 'household_id,date,slot,to_user_id' },
    );
  if (error) throw error;
}

/** Repas auxquels JE suis invité (chez un ami). */
export async function listMyMealInvites(userId: string): Promise<MealInvite[]> {
  const { data, error } = await supabase
    .from('meal_invites')
    .select('id, household_id, date, slot, from_user_id, to_user_id')
    .eq('to_user_id', userId)
    .order('date');
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const names = await profilesByIds(Array.from(new Set(rows.map((r) => r.from_user_id))));
  return rows.map((r) => ({
    id: r.id,
    household_id: r.household_id,
    date: r.date,
    slot: r.slot as MealSlot,
    fromName: names.get(r.from_user_id)?.display_name ?? 'Un ami',
  }));
}

/** Amis déjà invités à un repas donné (pour ne pas les proposer deux fois). */
export async function listInvitedFriendIds(date: string, slot: MealSlot): Promise<string[]> {
  const { data, error } = await supabase.from('meal_invites').select('to_user_id').eq('date', date).eq('slot', slot);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.to_user_id);
}

export async function cancelMealInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('meal_invites').delete().eq('id', inviteId);
  if (error) throw error;
}

/** Plats prévus au repas auquel je suis invité (lecture seule, via les règles RLS). */
export async function getInvitedMealDishes(invite: MealInvite): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('planning_entries')
    .select('dish:dishes(*)')
    .eq('household_id', invite.household_id)
    .eq('date', invite.date)
    .eq('slot', invite.slot);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => r.dish).filter(Boolean) as Dish[];
}
