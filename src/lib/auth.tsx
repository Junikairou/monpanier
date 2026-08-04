import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearAllGuestData } from './localTable';
import { enterGuestMode as enterGuestModeStorage, exitGuestMode as exitGuestModeStorage, GUEST_USER_ID, isGuestModeActive } from './guest';

// Session locale fictive utilisée en mode invité : permet à tout le reste de
// l'app (qui lit session.user.id / session.user.email) de fonctionner sans
// changement, alors qu'aucune donnée n'est envoyée à Supabase.
const GUEST_SESSION = { user: { id: GUEST_USER_ID, email: '' } } as unknown as Session;

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  guestMode: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  enterGuestMode: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  // Le listener onAuthStateChange s'enregistre une seule fois (effet à deps
  // vides) : sans ref, sa closure garderait à jamais la valeur de guestMode
  // au moment du montage (false), et l'événement "INITIAL_SESSION" que
  // Supabase émet toujours au démarrage écraserait la session invité par
  // null juste après l'entrée en mode invité.
  const guestModeRef = useRef(false);

  useEffect(() => {
    isGuestModeActive().then((active) => {
      if (active) {
        guestModeRef.current = true;
        setGuestMode(true);
        setSession(GUEST_SESSION);
        setInitializing(false);
        return;
      }
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setInitializing(false);
      });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (guestModeRef.current) return;
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
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
    const redirectTo =
      Platform.OS === 'web'
        ? `${window.location.origin}${window.location.pathname.startsWith('/monpanier') ? '/monpanier/' : '/'}`
        : 'monpanier://';
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      return error ? mapAuthError(error.message) : null;
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
    const redirectTo =
      Platform.OS === 'web'
        ? `${window.location.origin}${window.location.pathname.startsWith('/monpanier') ? '/monpanier/' : '/'}`
        : 'monpanier://';
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      return error ? mapAuthError(error.message) : null;
    } catch (e: any) {
      return mapAuthError(e?.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, initializing, guestMode, signIn, signUp, signInWithGoogle, signOut, resetPassword, enterGuestMode, exitGuestMode }}
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
  return message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
