import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    <AuthContext.Provider value={{ session, initializing, signIn, signUp, signInWithGoogle, signOut, resetPassword }}>
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
