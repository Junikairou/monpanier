import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextInput } from '../../../src/components/ScaledText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, LoadingBlock, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { FeedbackEntry, listMyFeedback, sendFeedback } from '../../../src/data/feedback';
import { fonts, radii } from '../../../src/theme/tokens';

export default function Feedback() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session!.user.id;

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listMyFeedback()
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await sendFeedback(userId, message);
      setMessage('');
      setSent(true);
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Feedback" subtitle="Un bug, une idée ? Écris-le ici" onBack={() => router.back()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Décris ton retour, un bug rencontré, ou une idée d'amélioration..."
          placeholderTextColor={colors.inkFaint}
          multiline
          numberOfLines={5}
          style={{
            borderWidth: 1.5,
            borderColor: colors.beigeDark,
            borderRadius: radii.sm,
            padding: 12,
            fontSize: 13.5,
            color: colors.ink,
            backgroundColor: colors.paper,
            minHeight: 100,
            textAlignVertical: 'top',
          }}
        />
        <View style={{ marginTop: 10 }}>
          <Pill label={sending ? 'Envoi…' : 'Envoyer'} variant="primary" disabled={sending || !message.trim()} onPress={submit} />
        </View>
        {sent ? <Text style={{ color: colors.forest, fontSize: 12.5, marginTop: 8, textAlign: 'center' }}>Envoyé, merci !</Text> : null}

        <Text style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, color: colors.inkFaint, marginTop: 24, marginBottom: 8 }}>
          Tes envois précédents
        </Text>
        {loading ? (
          <LoadingBlock />
        ) : history.length === 0 ? (
          <Text style={{ fontSize: 12.5, color: colors.inkFaint, fontStyle: 'italic' }}>Aucun envoi pour l'instant.</Text>
        ) : (
          history.map((f) => (
            <Card key={f.id} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9.5, color: colors.inkFaint, marginBottom: 4 }}>
                {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 12.5, color: colors.ink }}>{f.message}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
