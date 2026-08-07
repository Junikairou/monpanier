import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearAllGuestData } from './localTable';
import { enterGuestMode as enterGuestModeStorage, exitGuestMode as exitGuestModeStorage, GUEST_USER_ID, isGuestModeActive } from './guest';
import { consumeOAuthPending, markOAuthPending, oauthCallback, OAUTH_NO_SESSION_MESSAGE } from './authCallback';
import { siteOrigin } from './basePath';

// Session locale fictive utilisée en mode invité : permet à tout le reste de
// l'app (qui lit session.user.id / session.user.email) de fonctionner sans
// changement, alors qu'aucune donnée n'est envoyée à Supabase.
const GUEST_SESSION = { user: { id: GUEST_USER_ID, email: '' } } as unknown as Session;

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  guestMode: boolean;
  /** Message à afficher sur l'écran de connexion après un retour Google raté. */
  authNotice: string | null;
  clearAuthNotice: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  /** Connexion Google sans redirection : jeton d'identité fourni par Google Identity Services. */
  signInWithGoogleCredential: (idToken: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  enterGuestMode: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  adoptRealSession: (newSession: Session) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  // Le listener onAuthStateChange s'enregistre une seule fois (effet à deps
  // vides) : sans ref, sa closure garderait à jamais la valeur de guestMode
  // au moment du montage (false), et l'événement "INITIAL_SESSION" que
  // Supabase émet toujours au démarrage écraserait la session invité par
  // null juste après l'entrée en mode invité.
  const guestModeRef = useRef(false);

  useEffect(() => {
    const boot = async () => {
      if (await isGuestModeActive()) {
        guestModeRef.current = true;
        setGuestMode(true);
        setSession(GUEST_SESSION);
        setInitializing(false);
        return;
      }

      let current = (await supabase.auth.getSession()).data.session;

      // Filet de sécurité : l'URL de retour portait bien des jetons mais
      // supabase-js ne les a pas repris (fragment consommé trop tard, page
      // servie par le service worker, retour dans un autre onglet…).
      if (!current && oauthCallback.hasTokens) {
        const { data } = await supabase.auth.setSession({
          access_token: oauthCallback.accessToken!,
          refresh_token: oauthCallback.refreshToken!,
        });
        current = data.session ?? null;
      }

      setSession(current);
      setInitializing(false);

      // Diagnostic du retour Google : sans ça, un échec est totalement muet et
      // se traduit juste par "on revient sur la page de connexion".
      const wasPending = consumeOAuthPending();
      if (current) return;
      if (oauthCallback.error) setAuthNotice(oauthCallback.error);
      else if (wasPending) setAuthNotice(OAUTH_NO_SESSION_MESSAGE);
    };
    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (guestModeRef.current) return;
      setSession(newSession);
      if (newSession) setAuthNotice(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sur web (et surtout en PWA installée), la connexion Google se termine
  // souvent dans un onglet de navigateur distinct de l'app : la session est
  // bien écrite dans le stockage partagé, mais l'app restée ouverte en arrière
  // -plan garde son état "pas connecté" et réaffiche l'écran de connexion. On
  // relit donc la session à chaque retour au premier plan.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let disposed = false;
    const recheck = async () => {
      if (disposed || guestModeRef.current) return;
      const { data } = await supabase.auth.getSession();
      if (disposed || !data.session) return;
      setSession((prev) => prev ?? data.session);
      setAuthNotice(null);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    window.addEventListener('focus', recheck);
    window.addEventListener('pageshow', recheck);
    window.addEventListener('storage', recheck);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      window.removeEventListener('focus', recheck);
      window.removeEventListener('pageshow', recheck);
      window.removeEventListener('storage', recheck);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const enterGuestMode = async () => {
    await enterGuestModeStorage();
    guestModeRef.current = true;
    setGuestMode(true);
    setSession(GUEST_SESSION);
  };

  const exitGuestMode = async () => {
    await exitGuestModeStorage();
    await clearAllGuestData();
    guestModeRef.current = false;
    setGuestMode(false);
    setSession(null);
  };

  // Utilisé après avoir basculé un compte invité vers un vrai compte
  // (src/data/guestMigration.ts a déjà recopié les données et vidé le
  // stockage local à ce stade) : passe simplement l'app sur la vraie
  // session, sans repasser par exitGuestMode (qui efface les données —
  // inutile ici puisqu'elles sont déjà migrées).
  const adoptRealSession = async (newSession: Session) => {
    await exitGuestModeStorage();
    guestModeRef.current = false;
    setGuestMode(false);
    setSession(newSession);
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? mapAuthError(error.message) : null;
    } catch (e: any) {
      return mapAuthError(e?.message);
    }
  };

  const signUp: AuthContextValue['signUp'] = async (email, password) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? mapAuthError(error.message) : null;
    } catch (e: any) {
      return mapAuthError(e?.message);
    }
  };

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    const redirectTo = Platform.OS === 'web' ? siteOrigin() : 'monpanier://';
    setAuthNotice(null);
    markOAuthPending();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // Force le choix du compte : sans ça, Google réutilise silencieusement
          // la dernière session et on ne voit jamais l'échec éventuel.
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        consumeOAuthPending();
        return mapAuthError(error.message);
      }
      return null;
    } catch (e: any) {
      consumeOAuthPending();
      return mapAuthError(e?.message);
    }
  };

  const signInWithGoogleCredential: AuthContextValue['signInWithGoogleCredential'] = async (idToken) => {
    setAuthNotice(null);
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) return mapAuthError(error.message);
      if (data.session) setSession(data.session);
      return null;
    } catch (e: any) {
      return mapAuthError(e?.message);
    }
  };

  const signOut = async () => {
    if (guestMode) {
      await exitGuestMode();
      return;
    }
    await supabase.auth.signOut();
  };

  const resetPassword: AuthContextValue['resetPassword'] = async (email) => {
    const redirectTo = Platform.OS === 'web' ? siteOrigin() : 'monpanier://';
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      return error ? mapAuthError(error.message) : null;
    } catch (e: any) {
      return mapAuthError(e?.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        initializing,
        guestMode,
        authNotice,
        clearAuthNotice: () => setAuthNotice(null),
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGoogleCredential,
        signOut,
        resetPassword,
        enterGuestMode,
        exitGuestMode,
        adoptRealSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mapAuthError(message?: string): string {
  if (!message) return "Connexion impossible : aucune réponse du serveur (vérifie ta connexion internet).";
  if (message.includes('Invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (message.includes('already registered')) return 'Un compte existe déjà avec cet e-mail.';
  if (message.includes('Password should be')) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (message.includes('Failed to fetch') || message.includes('Network')) {
    return "Connexion impossible : le serveur n'a pas répondu (vérifie ta connexion internet).";
  }
  // Échec de création du compte côté base : le déclencheur on_auth_user_created
  // n'a pas pu créer le profil et le foyer, donc Supabase annule l'inscription.
  if (/database error|unexpected_failure/i.test(message)) {
    return (
      "Connexion impossible : le serveur n'a pas réussi à créer le compte " +
      '(erreur base de données à l\'inscription — déclencheur "on_auth_user_created"). ' +
      'À corriger côté Supabase.'
    );
  }
  // Certaines erreurs serveur remontent un corps vide ("{}") : sans ce garde-fou,
  // l'écran de connexion affichait littéralement "{}".
  if (/^\s*(\{\s*\}|\[\s*\]|null|undefined)\s*$/.test(message)) {
    return "Connexion impossible : le serveur a répondu par une erreur sans détail. Regarde les journaux Authentication de Supabase.";
  }
  return message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
