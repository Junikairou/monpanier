import { Platform } from 'react-native';

/**
 * Chemin racine du site sur le web.
 *
 * GitHub Pages sert un dépôt de projet dans un sous-dossier portant son nom
 * (`/monpanier/`, `/panier/`…). Ce chemin était écrit en dur à cinq endroits,
 * ce qui casse tout dès que le site change d'adresse : service worker hors
 * scope, manifeste introuvable, et surtout redirection de connexion Google
 * pointant vers un dossier qui n'existe pas.
 *
 * On le déduit donc à l'exécution, à partir de l'adresse du bundle JavaScript
 * chargé par la page — la seule source fiable, puisqu'elle est écrite par le
 * build lui-même et reste correcte quelle que soit la route affichée.
 *
 * Renvoie toujours un chemin commençant et finissant par `/` (`/panier/`), ou
 * `/` si le site est servi à la racine d'un domaine.
 */
function detectBasePath(): string {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return '/';
  try {
    const sources = Array.from(document.querySelectorAll('script[src]'))
      .map((el) => el.getAttribute('src') ?? '')
      .filter((src) => src.includes('_expo/'));
    for (const src of sources) {
      // Le src peut être absolu (https://host/panier/_expo/…) ou relatif.
      const path = src.startsWith('http') ? new URL(src).pathname : src;
      const marker = path.indexOf('_expo/');
      if (marker < 0) continue;
      const base = path.slice(0, marker);
      if (base.startsWith('/')) return base.endsWith('/') ? base : `${base}/`;
    }
  } catch {
    // Rien de lisible : on retombe sur la racine, ce qui reste vrai pour un
    // hébergement à la racine d'un domaine et pour le développement local.
  }
  return '/';
}

export const BASE_PATH = detectBasePath();

/** Adresse complète de la racine du site, utilisée comme retour de connexion. */
export function siteOrigin(): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  return `${window.location.origin}${BASE_PATH}`;
}
