import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SectionList,
  Alert,
  TextStyle,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import { Account, AccountType, AppError, Currency, formatCurrency } from '@cashmgr/core';
import { useAccountsService, useCurrenciesService } from '../../src/contexts/services-context';

const ACCOUNT_GROUPS: { type: AccountType; label: string }[] = [
  { type: 'cash', label: 'Cash' },
  { type: 'bank', label: 'Bank Accounts' },
  { type: 'credit', label: 'Credit Cards' },
];

function getGroupTotal(accounts: Account[], currencies: Currency[]): { formatted: string; isNegative: boolean } {
  const primary = currencies.find((c) => c.isPrimary);
  if (!primary) {
    const totals: Record<string, number> = {};
    for (const account of accounts) {
      totals[account.currency] = (totals[account.currency] ?? 0) + account.balance;
    }
    return {
      formatted: Object.entries(totals)
        .map(([currency, total]) => formatCurrency(total, currency))
        .join(' + '),
      isNegative: Object.values(totals).every((v) => v < 0),
    };
  }
  const rateMap = new Map(currencies.map((c) => [c.id, c.exchangeRate]));
  let total = 0;
  for (const account of accounts) {
    total += account.balance * (rateMap.get(account.currency) ?? 1);
  }
  return { formatted: formatCurrency(total, primary.id), isNegative: total < 0 };
}

export default function AccountsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const accountsService = useAccountsService();
  const currenciesService = useCurrenciesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadCurrencies = React.useCallback(async () => {
    try {
      const data = await currenciesService.listCurrencies(true);
      setCurrencies(data);
    } catch {
      // Non-critical: group totals fall back to per-currency display
    }
  }, [currenciesService]);

  const loadAccounts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountsService.listAccounts();
      setAccounts(data);
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load accounts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [accountsService]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await accountsService.listAccounts();
      setAccounts(data);
    } catch (err) {
      // Silent fail on refresh - data is already loaded
    } finally {
      setIsRefreshing(false);
    }
  }, [accountsService]);

  React.useEffect(() => {
    void loadAccounts();
    void loadCurrencies();
  }, [loadAccounts, loadCurrencies]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      void loadAccounts();
      void loadCurrencies();
    }, [loadAccounts, loadCurrencies])
  );

  const handleDelete = React.useCallback(
    async (account: Account) => {
      Alert.alert(
        'Delete Account',
        `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await accountsService.deleteAccount(account.id);
                await loadAccounts();
              } catch (err) {
                const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to delete account';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    },
    [accountsService, loadAccounts]
  );

  // F-053: Navigate to account-specific transactions screen
  const handleAccountTap = React.useCallback(
    (account: Account) => {
      router.push({
        pathname: '/account-transactions',
        params: { accountId: account.id },
      });
    },
    [router]
  );

  // Show actions menu (for long press or more button)
  const handleAccountActions = React.useCallback(
    (account: Account) => {
      Alert.alert('Account Actions', `What would you like to do with "${account.name}"?`, [
        {
          text: 'Edit',
          onPress: () => router.push(`/edit-account?id=${account.id}`),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(account),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [router, handleDelete]
  );

  // Handle use template - creates default accounts (Cash, Chequing, Savings)
  const handleUseTemplate = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await accountsService.createDefaultAccounts();
      await loadAccounts();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to create default accounts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [accountsService, loadAccounts]);

  const sections = React.useMemo(
    () =>
      ACCOUNT_GROUPS.flatMap((group) => {
        const data = accounts.filter((a) => a.type === group.type);
        if (data.length === 0) return [];
        const groupTotal = getGroupTotal(data, currencies);
        return [{ type: group.type, label: group.label, total: groupTotal.formatted, isNegative: groupTotal.isNegative, data }];
      }),
    [accounts, currencies]
  );

  const renderAccount = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={styles.accountCard}
      onPress={() => handleAccountTap(item)}
      onLongPress={() => handleAccountActions(item)}
      delayLongPress={500}
    >
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{item.name}</Text>
        <Text style={styles.accountType}>{item.currency}</Text>
      </View>
      <Text style={styles.accountBalance}>{formatCurrency(item.balance, item.currency)}</Text>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => handleAccountActions(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.moreButtonText}>⋯</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { label: string; total: string; isNegative: boolean } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderLabel}>{section.label}</Text>
      <Text style={[styles.sectionHeaderTotal, section.isNegative && styles.sectionHeaderTotalNegative]}>
        {section.total}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No accounts added</Text>
      <Text style={styles.emptyText}>
        Accounts help you track balances, categorise inflows, and surface insights. Add one to begin, or use the template to get started quickly.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/add-account')}>
        <Text style={styles.primaryButtonText}>Add an account</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleUseTemplate}>
        <Text style={styles.secondaryButtonText}>Use template</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-account')}>
        <Text style={styles.addButtonText}>Add Account</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      ) : accounts.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderAccount}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>{renderEmpty()}</ScrollView>
      )}
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] =>
  `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    listContent: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      margin: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    addButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      margin: theme.spacing.lg,
      marginBottom: 0,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#fcc',
    },
    errorText: {
      color: '#c00',
      fontWeight: fontWeight(500),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body.fontSize,
    },
    accountCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    accountInfo: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    accountName: {
      fontSize: 18,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    accountType: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
    },
    accountBalance: {
      fontSize: 18,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.sm,
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    secondaryButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(500),
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
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionHeaderLabel: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    sectionHeaderTotal: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    sectionHeaderTotalNegative: {
      color: theme.colors.danger,
    },
  });
