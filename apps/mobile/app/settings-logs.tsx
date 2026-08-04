import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextStyle, TouchableOpacity, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Theme, useTheme } from '@cashmgr/ui';
import { getMobileLogFile } from '../src/logging/mobile-file-logger';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function SettingsLogsScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [logSize, setLogSize] = React.useState<number | null>(null);
  const [isSharing, setIsSharing] = React.useState(false);

  const refreshLogInfo = React.useCallback(() => {
    const file = getMobileLogFile();
    setLogSize(file.exists ? file.size : null);
  }, []);

  useFocusEffect(React.useCallback(() => {
    refreshLogInfo();
  }, [refreshLogInfo]));

  const handleShare = React.useCallback(async () => {
    setIsSharing(true);
    try {
      const file = getMobileLogFile();
      if (!file.exists || file.size === 0) {
        Alert.alert('No errors logged yet', 'Cash Mgr. hasn’t logged any errors on this device.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Share log file' });
    } catch {
      Alert.alert('Error', 'Failed to share the log file');
    } finally {
      setIsSharing(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Logs', headerBackTitle: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Cash Mgr. keeps a local log of application errors on this device — it never leaves
          your device automatically. Share it here if you're reporting a bug.
        </Text>
        <Text style={styles.subtitle}>
          {logSize === null ? 'No errors logged yet' : `${formatBytes(logSize)} on this device`}
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, (isSharing || logSize === null) && styles.buttonDisabled]}
          onPress={handleShare}
          disabled={isSharing || logSize === null}
        >
          <Text style={styles.primaryButtonText}>
            {isSharing ? 'Preparing...' : 'Share Log File'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] => `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, gap: theme.spacing.md },
    description: { color: theme.colors.textSecondary, lineHeight: 20 },
    subtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.caption.fontSize },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
    },
    primaryButtonText: { color: '#ffffff', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
    buttonDisabled: { opacity: 0.5 },
  });
