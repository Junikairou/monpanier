import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { EmptyState, Screen, ScreenHeader } from './ui';

export function ComingSoon({ title, text }: { title: string; text?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title={title} onBack={() => router.back()} />
      <EmptyState text={text ?? 'Bientôt disponible.'} />
    </Screen>
  );
}
