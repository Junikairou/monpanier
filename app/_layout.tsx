import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { AuthProvider } from '../src/lib/auth';

const MAX_WIDTH = 480;

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen
        name="choisir-plat"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  );
}

function WebFrame({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.innerHTML = 'html, body, #root { height: 100%; margin: 0; }';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.beigeDark }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: MAX_WIDTH,
          // @ts-expect-error web-only shadow
          boxShadow: '0 0 40px rgba(0,0,0,0.15)',
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedStatusBar />
        <WebFrame>
          <RootStack />
        </WebFrame>
      </AuthProvider>
    </ThemeProvider>
  );
}
