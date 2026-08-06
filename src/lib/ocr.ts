import { Platform } from 'react-native';

/**
 * Lecture du texte d'une image (OCR) — tesseract.js, 100 % dans le navigateur :
 * aucune clé API, aucun envoi de la photo sur un serveur. Le moteur et le
 * dictionnaire français sont téléchargés depuis un CDN à la première
 * utilisation (quelques Mo, mis en cache ensuite par le navigateur), donc une
 * connexion est nécessaire la première fois.
 *
 * Non disponible sur mobile natif (le moteur est du WebAssembly navigateur) :
 * `isOcrAvailable()` permet de masquer le bouton dans ce cas.
 */
export function isOcrAvailable(): boolean {
  return Platform.OS === 'web';
}

export type OcrProgress = (percent: number) => void;

export async function readTextFromImage(uri: string, onProgress?: OcrProgress): Promise<string> {
  if (!isOcrAvailable()) throw new Error("La lecture de photo n'est disponible que sur la version web pour l'instant.");

  // tesseract.js est un module CommonJS : selon l'empaqueteur, l'import
  // dynamique renvoie soit le module lui-même, soit un objet avec `default`.
  const mod: any = await import('tesseract.js');
  const Tesseract = mod.default ?? mod;
  const result = await Tesseract.recognize(uri, 'fra', {
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return;
      // `recognizing text` est la phase longue ; le reste, c'est le chargement.
      if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
      else if (m.status.startsWith('loading') || m.status.startsWith('initializ')) onProgress(0);
    },
  });
  return cleanOcrText(result.data.text ?? '');
}

/**
 * Nettoie le texte brut de l'OCR : le moteur coupe souvent une ligne en deux et
 * confond quelques caractères sur les quantités.
 */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r/g, '')
    // "1 kg" mal lu en "l kg" / "I kg" en début de ligne
    .replace(/^[lI](?=\s?(kg|g|ml|cl|l|L)\b)/gm, '1')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n')
    .trim();
}
