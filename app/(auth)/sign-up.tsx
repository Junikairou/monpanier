import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Field, Pill } from '../../src/components/ui';

export default function SignUp() {
  const { colors } = useTheme();
  const { session, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(tabs)/planning" />;

  const onSubmit = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    const err = await signUp(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
    else setNotice('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={[styles.title, { color: colors.ink }]}>Créer un profil</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Pour sauvegarder tes plats, ton planning et tes courses
        </Text>

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
          placeholder="Au moins 6 caractères"
        />

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {notice ? <Text style={[styles.error, { color: colors.forest }]}>{notice}</Text> : null}

        <Pill label={loading ? 'Création…' : 'Créer mon profil'} variant="primary" onPress={onSubmit} disabled={loading} />

        <Link href="/(auth)/sign-in" style={[styles.link, { color: colors.forest }]}>
          Déjà un compte ? Se connecter
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60 },
  title: { fontSize: 26, fontStyle: 'italic', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 26 },
  error: { fontSize: 12.5, marginBottom: 10, textAlign: 'center' },
  link: { fontSize: 12.5, textAlign: 'center', marginTop: 18, fontWeight: '600' },
});
