import React, { useCallback, useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useDMSans,
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  useFonts as usePlayfair,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { AuthProvider } from '../src/lib/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

let defaultFontApplied = false;
function applyDefaultFont() {
  if (defaultFontApplied) return;
  defaultFontApplied = true;
  // @ts-expect-error RN Text supports defaultProps for a global font fallback
  Text.defaultProps = Text.defaultProps || {};
  // @ts-expect-error see above
  Text.defaultProps.style = [{ fontFamily: 'DMSans_400Regular' }, Text.defaultProps.style];
}

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

function WebFrame({ children, onLayout }: { children: React.ReactNode; onLayout: () => void }) {
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

  if (Platform.OS !== 'web') return <View style={{ flex: 1 }} onLayout={onLayout}>{children}</View>;
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.beigeDark }} onLayout={onLayout}>
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
  const [dmSansLoaded] = useDMSans({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });
  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
  });
  const fontsLoaded = dmSansLoaded && playfairLoaded;

  if (fontsLoaded) applyDefaultFont();

  const onLayout = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedStatusBar />
        <WebFrame onLayout={onLayout}>
          <RootStack />
        </WebFrame>
      </AuthProvider>
    </ThemeProvider>
  );
}
