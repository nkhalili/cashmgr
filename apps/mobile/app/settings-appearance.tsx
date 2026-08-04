import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { Theme, useTheme, AccentColor } from '@cashmgr/ui';
import { useThemePreference, ThemePreference } from '../src/contexts/theme-context';
import { useShowCreditBalances } from '../src/contexts/credit-display-context';
import { Switch } from '../src/components/Switch';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const ACCENT_OPTIONS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'teal', label: 'Teal', color: '#2f7d68' },
  { value: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { value: 'slate', label: 'Slate', color: '#475569' },
];

export default function SettingsAppearanceScreen() {
  const theme = useTheme();
  const { preference, setPreference, accent, setAccent } = useThemePreference();
  const { show: showCreditBalances, setShow: setShowCreditBalances } = useShowCreditBalances();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Appearance', headerBackTitle: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.toggleRow}>
            {THEME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.themeOption, preference === option.value && styles.themeOptionActive]}
                onPress={() => setPreference(option.value)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    preference === option.value && styles.themeOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accent color</Text>
          <View style={styles.toggleRow}>
            {ACCENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.accentOption,
                  accent === option.value && {
                    borderColor: option.color,
                    backgroundColor: theme.colors.primarySoft,
                  },
                ]}
                onPress={() => setAccent(option.value)}
              >
                <View style={{ width: 18, height: 18, borderRadius: 999, backgroundColor: option.color }} />
                <Text
                  style={[
                    styles.themeOptionText,
                    accent === option.value && { color: theme.colors.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accounts page</Text>
          <Switch
            value={showCreditBalances}
            onChange={setShowCreditBalances}
            label="Show balance payable / outstanding balance"
            helperText="Display credit card statement and outstanding balances on the Accounts page"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] => `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, gap: theme.spacing.xl },
    section: { gap: theme.spacing.sm },
    sectionTitle: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs,
    },
    toggleRow: { flexDirection: 'row', gap: theme.spacing.sm },
    themeOption: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    accentOption: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    themeOptionActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    themeOptionText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(500),
      color: theme.colors.textSecondary,
    },
    themeOptionTextActive: { color: '#ffffff' },
  });
