import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { supabase } from '../../../src/lib/supabase';
import { hasGuestDataToMigrate, migrateGuestDataToAccount } from '../../../src/data/guestMigration';
import { Field, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { fonts } from '../../../src/theme/tokens';

export default function LierCompte() {
  const { colors } = useTheme();
  const router = useRouter();
  const { guestMode, adoptRealSession } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cet écran n'a de sens qu'en mode invité (bascule vers un vrai compte).
  if (!guestMode) return <Redirect href="/(tabs)/profil" />;

  const runMigration = async (userId: string, newSession: any) => {
    try {
      if (await hasGuestDataToMigrate()) {
        await migrateGuestDataToAccount(userId);
      }
      await adoptRealSession(newSession);
      router.replace('/(tabs)/planning');
    } catch (e: any) {
      setError(
        e?.message
          ? `Compte connecté, mais la copie de tes données a échoué (${e.message}). Réessaie depuis cet écran — tes données invité sont toujours là.`
          : 'Compte connecté, mais la copie de tes données a échoué. Réessaie depuis cet écran.',
      );
    }
  };

  const onSignUp = async () => {
    setError(null);
    setNotice(null);
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      // Confirmation par e-mail désactivée sur ce projet : session immédiate.
      await runMigration(data.session.user.id, data.session);
      return;
    }
    setNotice(
      "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis reviens sur cet écran et utilise \"J'ai déjà un compte\" pour te connecter — tes plats, planning et courses seront alors copiés dessus.",
    );
  };

  const onSignIn = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    await runMigration(data.session.user.id, data.session);
  };

  return (
    <Screen>
      <ScreenHeader title="Créer un compte" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
            Tes plats, ton planning et ta liste de courses actuels seront copiés sur ce compte — rien n'est perdu.
          </Text>

          <View style={[styles.switchWrap, { backgroundColor: colors.beige }]}>
            <Pill
              label="Créer un compte"
              variant={mode === 'signup' ? 'primary' : 'ghost'}
              onPress={() => {
                setMode('signup');
                setError(null);
                setNotice(null);
              }}
            />
            <Pill
              label="J'ai déjà un compte"
              variant={mode === 'signin' ? 'primary' : 'ghost'}
              onPress={() => {
                setMode('signin');
                setError(null);
                setNotice(null);
              }}
            />
          </View>

          <Field
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="vous@exemple.fr"
          />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
          {mode === 'signup' ? (
            <Field
              label="Confirmer le mot de passe"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              placeholder="Retape le même mot de passe"
            />
          ) : null}

          {error ? <Text style={[styles.msg, { color: colors.danger }]}>{error}</Text> : null}
          {notice ? <Text style={[styles.msg, { color: colors.forest }]}>{notice}</Text> : null}

          <Pill
            label={loading ? '…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
            variant="primary"
            onPress={mode === 'signup' ? onSignUp : onSignIn}
            disabled={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 20, paddingTop: 10 },
  subtitle: { fontSize: 12.5, lineHeight: 18, marginBottom: 18 },
  switchWrap: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 4, marginBottom: 18 },
  msg: { fontSize: 12.5, marginBottom: 10, textAlign: 'center' },
});
