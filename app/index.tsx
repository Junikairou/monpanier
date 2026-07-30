import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/lib/auth';
import { useTheme } from '../src/theme/ThemeProvider';

export default function Index() {
  const { session, initializing } = useAuth();
  const { colors } = useTheme();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }

  return <Redirect href={session ? '/(tabs)/planning' : '/(auth)/sign-in'} />;
}
