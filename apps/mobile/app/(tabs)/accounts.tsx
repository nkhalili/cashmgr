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
import { useFocusEffect } from 'expo-router';
import { Theme, useTheme } from '@cashmgr/ui';
import { useSafeRouter } from '../../src/hooks/useSafeRouter';
import { Account, AppError, Currency, CreditAccountSummary, formatCurrency, ACCOUNT_TYPE_GROUPS as ACCOUNT_GROUPS } from '@cashmgr/core';
import { useAccountsService, useCurrenciesService, useTransactionsService } from '../../src/contexts/services-context';
import { useShowCreditBalances } from '../../src/contexts/credit-display-context';
import { getCreditAccountSummaries } from '../../src/services/credit-account-summary';

function computeSummary(
  accounts: Account[],
  currencies: Currency[],
): { assetsFormatted: string; liabilitiesFormatted: string; netFormatted: string; netIsNegative: boolean } | null {
  if (accounts.length === 0) return null;
  const primary = currencies.find((c) => c.isPrimary);
  const rateMap = new Map(currencies.map((c) => [c.id, c.exchangeRate]));
  let assets = 0;
  let liabilities = 0;
  for (const account of accounts) {
    const rate = primary ? (rateMap.get(account.currency) ?? 1) : 1;
    const converted = account.balance * rate;
    if (converted >= 0) {
      assets += converted;
    } else {
      liabilities += Math.abs(converted);
    }
  }
  const net = assets - liabilities;
  const displayCurrency = primary?.id ?? accounts[0]!.currency;
  return {
    assetsFormatted: formatCurrency(assets, displayCurrency),
    liabilitiesFormatted: formatCurrency(liabilities, displayCurrency),
    netFormatted: formatCurrency(net, displayCurrency),
    netIsNegative: net < 0,
  };
}

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
  const router = useSafeRouter();
  const accountsService = useAccountsService();
  const currenciesService = useCurrenciesService();
  const transactionsService = useTransactionsService();
  const { show: showCreditBalances } = useShowCreditBalances();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [creditSummaries, setCreditSummaries] = React.useState<Map<string, CreditAccountSummary>>(new Map());
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
      const [accountsData, currenciesData] = await Promise.all([
        accountsService.listAccounts(),
        currenciesService.listCurrencies(true),
      ]);
      setAccounts(accountsData);
      setCurrencies(currenciesData);
    } catch {
      // Silent fail on refresh - data is already loaded
    } finally {
      setIsRefreshing(false);
    }
  }, [accountsService, currenciesService]);

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

  // Load Balance Payable / Outstanding Balance for credit accounts
  React.useEffect(() => {
    if (!showCreditBalances) {
      setCreditSummaries(new Map());
      return;
    }
    let cancelled = false;
    void getCreditAccountSummaries(transactionsService, accounts).then((summaries) => {
      if (!cancelled) setCreditSummaries(summaries);
    });
    return () => {
      cancelled = true;
    };
  }, [accounts, showCreditBalances, transactionsService]);

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

  const summary = React.useMemo(() => computeSummary(accounts, currencies), [accounts, currencies]);

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

  const renderAccount = ({ item }: { item: Account }) => {
    const summary = item.type === 'credit' ? creditSummaries.get(item.id) : undefined;
    return (
      <TouchableOpacity
        style={styles.accountCard}
        onPress={() => handleAccountTap(item)}
        onLongPress={() => handleAccountActions(item)}
        delayLongPress={500}
      >
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{item.name}</Text>
          <Text style={styles.accountType}>{item.currency}</Text>
          {summary && (
            <>
              <Text style={styles.accountType}>
                Outstanding: {formatCurrency(summary.outstandingBalance, item.currency)}
              </Text>
              {summary.balancePayable != null && (
                <Text style={styles.accountType}>
                  Payable{summary.nextPaymentDueDate ? ` by ${summary.nextPaymentDueDate}` : ''}:{' '}
                  {formatCurrency(summary.balancePayable, item.currency)}
                </Text>
              )}
            </>
          )}
        </View>
        <Text style={[styles.accountBalance, item.balance < 0 && styles.accountBalanceNegative]}>{formatCurrency(item.balance, item.currency)}</Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleAccountActions(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.moreButtonText}>⋯</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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

  const renderSummary = () => {
    if (!summary) return null;
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Assets</Text>
          <Text style={styles.summaryValue}>{summary.assetsFormatted}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Liabilities</Text>
          <Text style={[styles.summaryValue, styles.summaryValueDanger]}>{summary.liabilitiesFormatted}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryValue, summary.netIsNegative ? styles.summaryValueDanger : styles.summaryValueSuccess]}>{summary.netFormatted}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      ) : accounts.length > 0 ? (
        <>
          {renderSummary()}
          <SectionList
            style={{ flex: 1 }}
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
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-account')}>
            <Text style={styles.addButtonText}>Add Account</Text>
          </TouchableOpacity>
        </>
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
    summaryCard: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryDivider: {
      width: 1,
      height: 36,
      backgroundColor: theme.colors.border,
    },
    summaryLabel: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    summaryValue: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(700),
      color: theme.colors.textPrimary,
    },
    summaryValueDanger: {
      color: theme.colors.danger,
    },
    summaryValueSuccess: {
      color: theme.colors.success,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      margin: theme.spacing.md,
      borderRadius: theme.components.interactiveRadius,
      alignItems: 'center',
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
    accountBalanceNegative: {
      color: theme.colors.danger,
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
