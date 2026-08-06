import { Platform } from 'react-native';

/**
 * Retour de la connexion Google (OAuth).
 *
 * Supabase renvoie le navigateur sur l'app avec, dans l'URL :
 *   - soit les jetons de session  → `#access_token=...&refresh_token=...`
 *   - soit une erreur             → `#error=...&error_description=...`
 *
 * Jusqu'ici l'app ignorait complètement le cas "erreur" : supabase-js nettoie
 * l'URL au démarrage, l'app ne trouvait pas de session et affichait l'écran de
 * connexion — sans le moindre message. D'où le symptôme "je choisis mon compte
 * Google et ça me ramène à la page de connexion, sans rien dire".
 *
 * On prend donc un instantané de l'URL AU CHARGEMENT DU MODULE, c'est-à-dire
 * avant que le client Supabase ne soit créé (ce fichier est importé en premier
 * par src/lib/supabase.ts) et donc avant qu'il n'efface le fragment.
 */

export type OAuthCallback = {
  /** L'URL de retour contenait bien une session utilisable. */
  hasTokens: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  /** Message lisible en français si le retour portait une erreur. */
  error: string | null;
  /** Code/description bruts, utiles pour un rapport de bug. */
  rawError: string | null;
};

const EMPTY: OAuthCallback = {
  hasTokens: false,
  accessToken: null,
  refreshToken: null,
  error: null,
  rawError: null,
};

const PENDING_KEY = 'monpanier.oauth.pending';
// Au-delà, on considère que la tentative est abandonnée (l'utilisateur a fermé
// l'onglet Google, par exemple) et on ne l'affiche plus comme un échec.
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

export const OAUTH_NO_SESSION_MESSAGE =
  "La connexion Google ne s'est pas terminée : ton compte Google a bien été choisi, mais aucune session n'est revenue à l'application. " +
  "Si tu utilises l'app installée sur l'écran d'accueil, essaie une fois depuis le navigateur (Chrome) pour voir si ça passe ; " +
  "sinon c'est l'adresse de retour qui n'est pas autorisée dans Supabase (Authentication → URL Configuration).";

function paramsFromUrl(url: string): URLSearchParams {
  const merged = new URLSearchParams();
  try {
    const parsed = new URL(url);
    // Le fragment d'abord : c'est là que Supabase met les jetons.
    new URLSearchParams(parsed.hash.replace(/^#/, '')).forEach((value, key) => merged.set(key, value));
    parsed.searchParams.forEach((value, key) => {
      if (!merged.has(key)) merged.set(key, value);
    });
  } catch {
    // URL illisible : on renvoie simplement des paramètres vides.
  }
  return merged;
}

export function describeOAuthError(code: string | null, description: string | null): string {
  const c = (code ?? '').toLowerCase();
  const d = (description ?? '').toLowerCase();

  if (c === 'access_denied' || d.includes('cancel')) {
    return 'Connexion Google annulée.';
  }
  if (d.includes('database error')) {
    return (
      "Connexion Google impossible : Supabase n'a pas réussi à créer le compte " +
      '(erreur base de données à l\'inscription — le déclencheur "on_auth_user_created" a échoué). ' +
      'À corriger côté Supabase, dans les logs Authentication.'
    );
  }
  if (d.includes('requested path is invalid') || d.includes('redirect') || c === 'invalid_request') {
    return (
      "Connexion Google impossible : l'adresse de retour de l'app n'est pas autorisée par Supabase. " +
      'Dans le tableau de bord Supabase → Authentication → URL Configuration, ajoute exactement ' +
      "l'adresse de l'app (avec le / final) dans « Redirect URLs »."
    );
  }
  if (c === 'bad_oauth_state' || d.includes('state')) {
    return (
      'Connexion Google impossible : la demande de connexion a été perdue en route ' +
      "(fréquent quand Google s'ouvre dans un autre navigateur que l'application). " +
      'Réessaie depuis Chrome directement.'
    );
  }
  if (d.includes('provider is not enabled') || d.includes('unsupported provider')) {
    return "Connexion Google impossible : le fournisseur Google n'est pas activé dans Supabase (Authentication → Providers).";
  }
  if (d.includes('signups not allowed')) {
    return "Connexion Google impossible : les inscriptions sont désactivées dans Supabase pour ce fournisseur.";
  }
  if (description) return `Connexion Google impossible : ${description}`;
  return `Connexion Google impossible (${code ?? 'erreur inconnue'}).`;
}

export function parseOAuthCallback(url: string): OAuthCallback {
  const params = paramsFromUrl(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('error') ?? params.get('error_code');
  const description = params.get('error_description');
  const rawError = code || description ? [code, description].filter(Boolean).join(' — ') : null;

  return {
    hasTokens: Boolean(accessToken && refreshToken),
    accessToken,
    refreshToken,
    error: rawError ? describeOAuthError(code, description) : null,
    rawError,
  };
}

/**
 * Instantané pris à l'import — donc avant `createClient()`, qui efface le
 * fragment de l'URL dès son initialisation.
 */
export const oauthCallback: OAuthCallback =
  Platform.OS === 'web' && typeof window !== 'undefined' ? parseOAuthCallback(window.location.href) : EMPTY;

/** Mémorise qu'une connexion Google vient d'être lancée (avant la redirection). */
export function markOAuthPending(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_KEY, String(Date.now()));
  } catch {
    // Stockage indisponible (navigation privée) : on se passe du diagnostic.
  }
}

/** Lit puis efface le marqueur : `true` si une connexion Google était en cours. */
export function consumeOAuthPending(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    window.localStorage.removeItem(PENDING_KEY);
    if (!raw) return false;
    const startedAt = Number(raw);
    return Number.isFinite(startedAt) && Date.now() - startedAt < PENDING_MAX_AGE_MS;
  } catch {
    return false;
  }
}
