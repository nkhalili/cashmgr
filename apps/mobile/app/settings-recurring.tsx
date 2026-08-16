import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeRouter } from '../src/hooks/useSafeRouter';
import { Theme, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  RecurringTransaction,
  AppError,
  RECURRING_FREQUENCY_LABELS,
  formatDate,
} from '@cashmgr/core';
import {
  useRecurringTransactionsService,
  useAccountsService,
  useCategoriesService,
} from '../src/contexts/services-context';

const fontWeight = (weight: number): TextStyle['fontWeight'] =>
  `${weight}` as TextStyle['fontWeight'];

const TYPE_ICON: Record<string, string> = { income: '↑', expense: '↓', transfer: '⇄' };

export default function SettingsRecurringScreen() {
  const theme = useTheme();
  const router = useSafeRouter();
  const recurringService = useRecurringTransactionsService();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [items, setItems] = React.useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const accountsMap = React.useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoriesMap = React.useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const loadItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, accountsData, categoriesData] = await Promise.all([
        recurringService.listRecurringTransactions(),
        accountsService.listAccounts(),
        categoriesService.listCategories(true),
      ]);
      setItems(data);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [recurringService, accountsService, categoriesService]);

  useFocusEffect(
    React.useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const handleActions = React.useCallback((item: RecurringTransaction) => {
    Alert.alert(
      `${RECURRING_FREQUENCY_LABELS[item.frequency]} ${item.type}`,
      undefined,
      [
        {
          text: 'Edit',
          onPress: () => router.push({ pathname: '/settings-recurring-edit', params: { id: item.id } }),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Recurring Transaction',
              'Future occurrences will be removed. Past transactions are kept.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await recurringService.deleteRecurringTransaction(item.id);
                      setItems(prev => prev.filter(i => i.id !== item.id));
                    } catch (err) {
                      Alert.alert('Error', err instanceof AppError ? err.getUserMessage() : 'Failed to delete');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [router, recurringService]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Recurring Transactions', headerBackTitle: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No recurring transactions</Text>
            <Text style={styles.emptySubtitle}>
              When adding a transaction, toggle "Make recurring" to schedule it to repeat automatically.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-transaction')}
            >
              <Text style={styles.addButtonText}>Add transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push({ pathname: '/settings-recurring-edit', params: { id: item.id } })}
                onLongPress={() => handleActions(item)}
                delayLongPress={500}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.amount, { color: item.type === 'income' ? theme.colors.success ?? '#16a34a' : item.type === 'expense' ? theme.colors.danger : theme.colors.primary }]}>
                      {TYPE_ICON[item.type]}{' '}
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: item.currency }).format(item.amount)}
                    </Text>
                    <Text style={[styles.typeLabel, { color: item.type === 'income' ? theme.colors.success ?? '#16a34a' : item.type === 'expense' ? theme.colors.danger : theme.colors.primary }]}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                    <Text style={styles.frequency}>
                      {RECURRING_FREQUENCY_LABELS[item.frequency]}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: item.isActive ? '#d1fae5' : theme.colors.surfaceMuted }]}>
                      <Text style={[styles.badgeText, { color: item.isActive ? '#065f46' : theme.colors.textSecondary }]}>
                        {item.isActive ? 'Active' : 'Paused'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => handleActions(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.moreButtonText}>⋯</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>Starts {formatDate(item.startDate)}</Text>
                  <Text style={styles.metaText}>Ends {item.endDate ? formatDate(item.endDate) : 'Never'}</Text>
                  {item.lastGeneratedDate && (
                    <Text style={styles.metaText}>Last generated {formatDate(item.lastGeneratedDate)}</Text>
                  )}
                </View>
                {(() => {
                  const acc = accountsMap.get(item.accountId);
                  const accName = acc?.name ?? '—';
                  if (item.type === 'transfer') {
                    const toAcc = item.toAccountId ? accountsMap.get(item.toAccountId) : undefined;
                    return <Text style={styles.metaText}>{accName}{toAcc ? ` → ${toAcc.name}` : ''}</Text>;
                  }
                  const cat = item.categoryId ? categoriesMap.get(item.categoryId) : undefined;
                  const catLabel = cat ? `${cat.icon ? cat.icon + ' ' : ''}${cat.name}` : '';
                  return <Text style={styles.metaText}>{accName}{catLabel ? ` | ${catLabel}` : ''}</Text>;
                })()}
                {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.lg,
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#fcc',
      marginBottom: theme.spacing.lg,
    },
    errorText: {
      color: '#c00',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
      gap: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: fontWeight(theme.typography.h2.fontWeight),
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: fontWeight(600),
      fontSize: theme.typography.body.fontSize,
    },
    list: {
      gap: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardInfo: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    amount: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(700),
    },
    typeLabel: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
    },
    frequency: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 99,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: fontWeight(600),
    },
    moreButton: {
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
    },
    moreButtonText: {
      fontSize: 20,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(700),
    },
    cardMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    metaText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
    },
    notes: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
  });
