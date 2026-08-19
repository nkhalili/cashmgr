import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextStyle, TouchableOpacity, Linking, Platform } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { Theme, useTheme } from '@cashmgr/ui';

const BUG_REPORT_EMAIL = 'cashmgr.support@gmail.com';
const APP_VERSION = Constants.expoConfig?.version ?? '—';

function buildMailtoUrl(): string {
  const platform = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
  const subject = `Cash Mgr. Bug Report (v${APP_VERSION}, ${platform})`;
  const body = `Describe the bug:\n\n\nSteps to reproduce:\n\n\n---\nApp version: ${APP_VERSION}\nPlatform: ${platform}`;
  return `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function SettingsReportBugScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [copied, setCopied] = React.useState(false);

  const handleEmail = React.useCallback(() => {
    Linking.openURL(buildMailtoUrl()).catch(() => {});
  }, []);

  const handleCopy = React.useCallback(async () => {
    await Clipboard.setStringAsync(BUG_REPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Report a Bug', headerBackTitle: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Send us a description of the bug and the steps to reproduce it. This opens your email
          app with a message pre-addressed to us — nothing is sent automatically.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleEmail} activeOpacity={0.7}>
          <Text style={styles.primaryButtonText}>Email Us</Text>
        </TouchableOpacity>

        <View style={styles.emailRow}>
          <View style={styles.emailText}>
            <Text style={styles.emailLabel}>Prefer to send it yourself?</Text>
            <Text style={styles.emailAddress}>{BUG_REPORT_EMAIL}</Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.7}>
            <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>
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
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
    },
    primaryButtonText: { color: '#ffffff', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    emailText: { flex: 1, gap: 2 },
    emailLabel: { fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary },
    emailAddress: { fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(500), color: theme.colors.textPrimary },
    copyButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.secondarySoft,
    },
    copyButtonText: { color: theme.colors.secondary, fontSize: theme.typography.caption.fontSize, fontWeight: fontWeight(600) },
  });
