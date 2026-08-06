import { Platform } from 'react-native';

export const MAX_PHOTO_SIZE = 900; // px (côté le plus long)
const JPEG_QUALITY = 0.72;

/**
 * Réduit une image avant stockage : une photo de téléphone fait 3-8 Mo, on la
 * ramène à ~100-200 Ko. Sur le web on passe par un <canvas> ; sur natif on
 * renvoie l'image telle quelle (expo-image-picker a déjà appliqué `quality`).
 */
export async function resizeImageToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  if (Platform.OS !== 'web') return blob;

  try {
    const resized = await resizeOnCanvas(blob);
    // Si le redimensionnement ne gagne rien, on garde l'original.
    return resized && resized.size < blob.size ? resized : blob;
  } catch {
    return blob;
  }
}

/** Même chose, mais renvoie une data URI (utilisée en mode invité : pas de serveur). */
export async function resizeImageToDataUri(uri: string): Promise<string> {
  const blob = await resizeImageToBlob(uri);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(blob);
  });
}

async function resizeOnCanvas(blob: Blob): Promise<Blob | null> {
  const bitmapUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(bitmapUrl);
    const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((out) => resolve(out), 'image/jpeg', JPEG_QUALITY);
    });
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = src;
  });
}
