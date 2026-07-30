import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { Field, Pill } from '../../src/components/ui';
import { fonts } from '../../src/theme/tokens';

export default function SignIn() {
  const { colors } = useTheme();
  const { session, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(tabs)/planning" />;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={[styles.brand, { color: colors.ink }]}>Mijoté</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Bon retour</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Connectez-vous pour retrouver votre planning
        </Text>

        {!isSupabaseConfigured && (
          <View style={[styles.warning, { backgroundColor: colors.beige, borderColor: colors.honey }]}>
            <Text style={{ color: colors.ink, fontSize: 12.5, lineHeight: 18 }}>
              Supabase n'est pas encore configuré. Renseigne EXPO_PUBLIC_SUPABASE_URL et
              EXPO_PUBLIC_SUPABASE_ANON_KEY dans un fichier .env à la racine du projet, puis relance
              le serveur.
            </Text>
          </View>
        )}

        <Field
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.fr"
        />
        <Field
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <Pill label={loading ? 'Connexion…' : 'Se connecter'} variant="primary" onPress={onSubmit} disabled={loading} />

        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.inkSoft, marginVertical: 14 }}>ou</Text>
        <Pill label="Continuer avec Google" onPress={() => signInWithGoogle().then((e) => e && setError(e))} />

        <Link href="/(auth)/sign-up" style={[styles.link, { color: colors.forest }]}>
          Pas de compte ? Créer un profil
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60 },
  brand: { fontSize: 14, fontFamily: fonts.bodySemiBold, letterSpacing: 2, textAlign: 'center', marginBottom: 40, textTransform: 'uppercase' },
  title: { fontSize: 27, fontFamily: fonts.display, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 26 },
  warning: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 18 },
  error: { fontSize: 12.5, marginBottom: 10, textAlign: 'center' },
  link: { fontSize: 12.5, textAlign: 'center', marginTop: 18, fontFamily: fonts.bodySemiBold },
});
