import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@cashmgr/ui';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { ThemePreferenceProvider } from '../src/contexts/theme-context';
import { ServicesProvider } from '../src/contexts/services-context';

function RootStack() {
  const theme = useTheme();

  const navTheme = React.useMemo(() => {
    const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
        primary: theme.colors.primary,
        notification: theme.colors.primary,
      },
    };
  }, [theme]);

  return (
    <NavThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.textPrimary, fontFamily: theme.fontFamily },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ServicesProvider>
        <RootStack />
      </ServicesProvider>
    </ThemePreferenceProvider>
  );
}
