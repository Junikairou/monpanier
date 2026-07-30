import React, { useEffect, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/lib/auth';
import { useTheme } from '../../src/theme/ThemeProvider';
import { getProfile } from '../../src/data/profile';

export default function TabsLayout() {
  const { session, initializing } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    getProfile(session.user.id)
      .then((p) => setOnboarded(p.onboarded))
      .catch(() => setOnboarded(true));
  }, [session]);

  if (initializing) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (onboarded === null) return null;
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'DMSans_500Medium' },
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => <Ionicons name="basket-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plats"
        options={{
          title: 'Plats',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
