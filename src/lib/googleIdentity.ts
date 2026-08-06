import { Platform } from 'react-native';

/**
 * Connexion Google « dans la page » (Google Identity Services).
 *
 * Le flux habituel (supabase.auth.signInWithOAuth) sort de l'app vers Google
 * puis revient par une redirection. Sur Android, quand l'app est installée sur
 * l'écran d'accueil, ce retour est intercepté par le système : Android relance
 * l'application installée et le jeton de session, placé dans le `#fragment` de
 * l'adresse de retour, est perdu en route — l'app se rouvre déconnectée. C'est
 * précisément le bug constaté (test du 2026-08-06 : la connexion démarrée dans
 * Chrome bascule sur l'app installée, qui affiche l'écran de connexion).
 *
 * Google Identity Services supprime complètement cet aller-retour : Google
 * renvoie un jeton d'identité directement à la page, que l'on échange contre
 * une session Supabase (`signInWithIdToken`). Rien ne transite par l'adresse
 * de la page, donc plus rien à perdre.
 *
 * Nécessite `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (identifiant client « Web » Google,
 * le même que celui configuré dans Supabase → Authentication → Google) et que
 * l'adresse du site figure dans « Authorized JavaScript origins » côté Google
 * Cloud Console. Sans ça, on retombe automatiquement sur l'ancien flux.
 */

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const SCRIPT_ID = 'google-identity-services';
const LOAD_TIMEOUT_MS = 8000;

export const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export function isGoogleIdentityConfigured(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && googleClientId.length > 0;
}

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

function getGoogle(): GoogleAccounts | null {
  return (window as unknown as { google?: GoogleAccounts }).google ?? null;
}

let loader: Promise<GoogleAccounts> | null = null;

/** Charge le script Google une seule fois pour toute la durée de vie de l'app. */
export function loadGoogleIdentity(): Promise<GoogleAccounts> {
  if (!isGoogleIdentityConfigured()) return Promise.reject(new Error('Google Identity non configuré'));
  const already = getGoogle();
  if (already?.accounts?.id) return Promise.resolve(already);
  if (loader) return loader;

  loader = new Promise<GoogleAccounts>((resolve, reject) => {
    const done = (fn: () => void) => {
      window.clearTimeout(timer);
      fn();
    };
    const timer = window.setTimeout(() => {
      loader = null;
      reject(new Error('Google Identity : script indisponible (hors ligne ?)'));
    }, LOAD_TIMEOUT_MS);

    const onReady = () => {
      const google = getGoogle();
      if (google?.accounts?.id) done(() => resolve(google));
      else done(() => { loader = null; reject(new Error('Google Identity : script chargé mais inutilisable')); });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', onReady);
      existing.addEventListener('error', () => done(() => { loader = null; reject(new Error('Google Identity : chargement impossible')); }));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = onReady;
    script.onerror = () => done(() => { loader = null; reject(new Error('Google Identity : chargement impossible')); });
    document.head.appendChild(script);
  });

  return loader;
}

/**
 * Affiche le bouton officiel « Continuer avec Google » dans `parent` et appelle
 * `onCredential` avec le jeton d'identité une fois le compte choisi.
 */
export async function renderGoogleButton(
  parent: HTMLElement,
  width: number,
  onCredential: (idToken: string) => void,
): Promise<void> {
  const google = await loadGoogleIdentity();
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: (response: { credential?: string }) => {
      if (response?.credential) onCredential(response.credential);
    },
    // Fenêtre superposée plutôt que redirection : c'est tout l'intérêt ici.
    ux_mode: 'popup',
    auto_select: false,
    itp_support: true,
  });
  parent.innerHTML = '';
  google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'center',
    locale: 'fr',
    width: Math.max(200, Math.min(400, Math.round(width))),
  });
}
