import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { updateProfile } from './profile';

export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permission refusée pour accéder aux photos.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const ext = asset.uri.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  await updateProfile(userId, { avatar_url: url });
  return url;
}
