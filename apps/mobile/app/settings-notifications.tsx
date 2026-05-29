import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';

export default function SettingsNotificationsScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Data & Notifications', headerBackTitle: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Decide how often Cash Mgr. nudges you with updates. Desktop, web, and mobile stay in
          lockstep once syncing is enabled.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg },
    description: { color: theme.colors.textSecondary, lineHeight: 20 },
  });
