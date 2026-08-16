import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextStyle,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { Theme, useTheme } from '@cashmgr/ui';
import { useThemePreference } from '../src/contexts/theme-context';
import iconLight from '../assets/icon.png';
import iconDark from '../assets/icon-dark.png';

const REPO_URL = 'https://github.com/nkhalili/cashmgr';
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/nkhalili';
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/nkhalili';

const APP_VERSION = Constants.expoConfig?.version ?? '—';

const LINKS = [
  { label: 'Source Code', subtitle: 'View on GitHub', url: REPO_URL, icon: '🐙' },
  { label: 'Report an Issue', subtitle: 'GitHub Issues', url: `${REPO_URL}/issues`, icon: '🐛' },
  { label: 'Sponsor on GitHub', subtitle: 'Support via GitHub Sponsors', url: GITHUB_SPONSORS_URL, icon: '💖' },
  { label: 'Buy Me a Coffee', subtitle: 'One-time donation', url: BUY_ME_A_COFFEE_URL, icon: '☕' },
];


export default function SettingsAboutScreen() {
  const theme = useTheme();
  const { isDark } = useThemePreference();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'About', headerBackTitle: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* App identity card */}
        <View style={styles.identityCard}>
          <Image source={isDark ? iconDark : iconLight} style={styles.appIcon} />
          <Text style={styles.appName}>Cash Mgr.</Text>
          <Text style={styles.appDescription}>
            A free, open source, offline-first personal finance manager.
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v{APP_VERSION}</Text>
          </View>
        </View>

        {/* Links group */}
        <View style={styles.group}>
          <Text style={styles.groupHeader}>LINKS</Text>
          <View style={styles.groupCard}>
            {LINKS.map((item, index) => (
              <TouchableOpacity
                key={item.url}
                style={[styles.row, index < LINKS.length - 1 && styles.rowDivider]}
                onPress={() => openURL(item.url)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.emojiWrap}>
                    <Text style={styles.rowEmoji}>{item.icon}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Text style={styles.externalArrow}>↗</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* License */}
        <TouchableOpacity onPress={() => openURL(`${REPO_URL}/blob/main/LICENSE`)}>
          <Text style={styles.license}>
            Licensed under{' '}
            <Text style={styles.licenseLink}>AGPL-3.0</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] =>
  `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, gap: theme.spacing.lg, alignItems: 'stretch' },

    identityCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    appIcon: {
      width: 72,
      height: 72,
      borderRadius: theme.radii.lg,
    },
    appName: {
      fontSize: theme.typography.h1.fontSize,
      fontWeight: fontWeight(parseInt(String(theme.typography.h1.fontWeight), 10) || 700),
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.xs,
    },
    appDescription: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    versionBadge: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primarySoft,
    },
    versionText: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.primary,
    },

    group: { gap: theme.spacing.xs },
    groupHeader: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
      paddingHorizontal: theme.spacing.xs,
    },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    emojiWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowEmoji: { fontSize: 18 },
    rowText: { flex: 1, gap: 2 },
    rowLabel: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(500),
      color: theme.colors.textPrimary,
    },
    rowSubtitle: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
    },
    externalArrow: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },

    license: {
      textAlign: 'center',
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
    },
    licenseLink: {
      color: theme.colors.primary,
    },
  });
