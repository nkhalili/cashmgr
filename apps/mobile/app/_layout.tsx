import React from 'react';
import { Stack } from 'expo-router';
import { ThemePreferenceProvider } from '../src/contexts/theme-context';
import { ServicesProvider } from '../src/contexts/services-context';

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ServicesProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ServicesProvider>
    </ThemePreferenceProvider>
  );
}
