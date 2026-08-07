import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { isGuestUserId } from '../lib/guest';
import { resizeImageToBlob, resizeImageToDataUri } from '../lib/imageResize';

const BUCKET = 'dish-photos';

/**
 * Choisit une photo dans la galerie et renvoie l'URL à stocker dans
 * `dishes.image_url`. En mode invité, rien ne part sur le réseau : la photo est
 * gardée en data URI dans le stockage local, comme le reste des données invité.
 */
export async function pickAndUploadDishPhoto(userId: string): Promise<string | null> {
  const asset = await pickImage([4, 3]);
  if (!asset) return null;

  if (isGuestUserId(userId)) return await resizeImageToDataUri(asset.uri);

  const blob = await resizeImageToBlob(asset.uri);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  });
  if (error) {
    // Le dossier de stockage se crée côté serveur : impossible depuis l'app,
    // qui n'en a pas les droits. Autant le dire clairement plutôt que de
    // laisser remonter un « Bucket not found » incompréhensible.
    if (/bucket not found|does not exist/i.test(error.message)) {
      throw new Error(
        "Les photos de recette ne sont pas encore activées sur ce serveur : l'espace de stockage « dish-photos » n'existe pas.",
      );
    }
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Sélecteur d'image partagé (photo de plat, photo à analyser pour l'import). */
export async function pickImage(aspect?: [number, number]): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permission refusée pour accéder aux photos.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: !!aspect,
    aspect,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}
