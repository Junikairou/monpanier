import React, { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, View } from 'react-native';
import { Text } from '../../../src/components/ScaledText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, Pill, Screen, ScreenHeader } from '../../../src/components/ui';
import { fonts } from '../../../src/theme/tokens';

export default function Parametres() {
  const { colors } = useTheme();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const clearLocalCache = () => {
    const run = async () => {
      setClearing(true);
      try {
        await AsyncStorage.multiRemove(['mijote.theme-preference', 'mijote.text-scale', 'tabs_intro_dismissed']);
        if (Platform.OS === 'web') window.location.reload();
      } finally {
        setClearing(false);
      }
    };
    const message = 'Remet le thème, la taille du texte et le petit tutoriel des onglets à zéro sur cet appareil. Tes données (plats, planning, courses) ne sont pas concernées.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Réinitialiser les préférences d'affichage de cet appareil ?\n${message}`)) run();
      return;
    }
    Alert.alert("Réinitialiser les préférences d'affichage ?", message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="Paramètres" onBack={() => router.back()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
        <Text style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, color: colors.inkFaint, marginBottom: 8 }}>
          Application
        </Text>
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.ink }}>Version</Text>
            <Text style={{ fontSize: 13, color: colors.inkFaint }}>{version}</Text>
          </View>
          <Pill label="Voir le code source (GitHub)" variant="ghost" onPress={() => Linking.openURL('https://github.com/Junikairou/monpanier')} />
        </Card>

        <Text style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, color: colors.inkFaint, marginTop: 22, marginBottom: 8 }}>
          Cet appareil
        </Text>
        <Card style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 17 }}>
            Le thème, la taille du texte et le fait d'avoir déjà vu le tutoriel des onglets sont mémorisés uniquement sur cet appareil (pas synchronisés entre plusieurs téléphones/ordinateurs).
          </Text>
          <Pill label={clearing ? '…' : 'Réinitialiser les préférences de cet appareil'} variant="ghost" disabled={clearing} onPress={clearLocalCache} />
        </Card>

        <Text style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fonts.bodySemiBold, color: colors.inkFaint, marginTop: 22, marginBottom: 8 }}>
          Notifications
        </Text>
        <Card>
          <Text style={{ fontSize: 12, color: colors.inkSoft, fontStyle: 'italic' }}>Pas encore disponible.</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
