import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useTheme } from '@cashmgr/ui';
import { useCurrenciesService } from '../../src/contexts/services-context';
import { useThemePreference } from '../../src/contexts/theme-context';

const THEME_LABELS: Record<string, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

interface SettingsRow {
  label: string;
  subtitle?: string;
  route: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

interface SettingsGroup {
  header: string;
  rows: SettingsRow[];
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currenciesService = useCurrenciesService();
  const { preference } = useThemePreference();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [primaryCurrencyId, setPrimaryCurrencyId] = React.useState<string | null>(null);

  const loadPrimaryCurrency = React.useCallback(async () => {
    try {
      const list = await currenciesService.listCurrencies(true);
      const primary = list.find((c) => c.isPrimary);
      setPrimaryCurrencyId(primary?.id ?? null);
    } catch {
      // non-fatal: subtitle just won't show
    }
  }, [currenciesService]);

  React.useEffect(() => {
    void loadPrimaryCurrency();
  }, [loadPrimaryCurrency]);

  useFocusEffect(
    React.useCallback(() => {
      void loadPrimaryCurrency();
    }, [loadPrimaryCurrency])
  );

  const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development';

  const groups: SettingsGroup[] = [
    {
      header: 'Preferences',
      rows: [
        {
          label: 'Currencies',
          subtitle: primaryCurrencyId ?? undefined,
          route: '/settings-currencies',
          icon: 'cash-outline',
        },
        {
          label: 'Budgets',
          subtitle: 'Monthly category budgets',
          route: '/budgets',
          icon: 'pie-chart-outline',
        },
        {
          label: 'Appearance',
          subtitle: THEME_LABELS[preference] ?? 'System',
          route: '/settings-appearance',
          icon: 'color-palette-outline',
        },
      ],
    },
    {
      header: 'Data',
      rows: [
        {
          label: 'Backup',
          route: '/settings-backup',
          icon: 'cloud-upload-outline',
        },
        {
          label: 'Transactions (CSV)',
          route: '/settings-csv',
          icon: 'document-text-outline',
        },
      ],
    },
    {
      header: 'App',
      rows: [
        {
          label: 'Data & Notifications',
          route: '/settings-notifications',
          icon: 'notifications-outline',
        },
      ],
    },
    ...(isDevelopment
      ? [
          {
            header: 'Development',
            rows: [
              {
                label: 'Development Tools',
                route: '/settings-development',
                icon: 'construct-outline' as const,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {groups.map((group) => (
          <View key={group.header} style={styles.group}>
            <Text style={styles.groupHeader}>{group.header.toUpperCase()}</Text>
            <View style={styles.groupCard}>
              {group.rows.map((row, index) => (
                <TouchableOpacity
                  key={row.route}
                  style={[
                    styles.row,
                    index < group.rows.length - 1 && styles.rowDivider,
                  ]}
                  onPress={() => router.push(row.route as Parameters<typeof router.push>[0])}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconWrap}>
                      <Ionicons name={row.icon} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      {row.subtitle ? (
                        <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted ?? theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] => `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, gap: theme.spacing.md },
    group: { gap: theme.spacing.xs },
    groupHeader: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
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
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
  });
