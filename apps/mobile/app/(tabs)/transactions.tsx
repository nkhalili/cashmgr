import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextStyle,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Theme, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  Transaction,
  TransactionType,
  AppError,
  ErrorHandler,
  formatCurrency,
  FilterParams,
  getTodayDateString,
  getMonthStartDateString,
  getMonthEndDateString,
} from '@cashmgr/core';
import {
  useAccountsService,
  useCategoriesService,
  useTransactionsService,
} from '../../src/contexts/services-context';
import { SelectionModal } from '../../src/components/SelectionModal';
import { DateRangeModal } from '../../src/components/DateRangeModal';
import { FilterChip } from '../../src/components/FilterChip';
import { MonthNavigator } from '../../src/components/MonthNavigator';
import { SummaryCard, type SummaryItem } from '../../src/components/SummaryCard';
import { useTransactionFilters } from '../../src/hooks/useTransactionFilters';
import { useCategoryFormatter } from '../../src/hooks/useCategoryFormatter';

const TYPE_OPTIONS: { label: string; value: TransactionType | '' }[] = [
  { label: 'All Types', value: '' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
];

// Memoized SearchBar component to prevent losing focus on re-renders
const SearchBar = React.memo(({
  value,
  onChangeText,
  onClear,
  theme,
  styles,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  theme: Theme;
  styles: any;
}) => (
  <View style={styles.searchContainer}>
    <TextInput
      style={styles.searchInput}
      placeholder="Search transactions..."
      placeholderTextColor={theme.colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
    />
    {value.length > 0 && (
      <TouchableOpacity
        style={styles.searchClear}
        onPress={onClear}
      >
        <Text style={styles.searchClearText}>×</Text>
      </TouchableOpacity>
    )}
  </View>
));

// F-052: Weekday abbreviations for daily grouping
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// F-052: Daily group structure for SectionList
interface DailyGroup {
  date: string;           // YYYY-MM-DD
  dayNumber: string;      // "05", "12", etc. (zero-padded)
  weekday: string;        // "Mon", "Tue", etc.
  data: Transaction[];    // SectionList requires 'data' property
  dayIncome: number;
  dayExpenses: number;
}

type ModalType = 'type' | 'account' | 'category' | 'dateRange' | null;

export default function TransactionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  // F-053: Read accountId from route params
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();
  const transactionsService = useTransactionsService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Data state
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // Use filter hook to manage all filter state
  const {
    state: filterState,
    dispatch: filterDispatch,
    derived,
    debouncedSearchQuery,
  } = useTransactionFilters(accountId, accounts, categories);

  // Use category formatter hook
  const { flattenedCategories, categoryMap, accountMap } =
    useCategoryFormatter(categories, accounts);

  // UI state
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeModal, setActiveModal] = React.useState<ModalType>(null);

  // Temp state for date range modal
  const [tempStartDate, setTempStartDate] = React.useState('');
  const [tempEndDate, setTempEndDate] = React.useState('');

  // Memoized search callbacks to prevent SearchBar from re-rendering
  // Empty dependencies are safe because filterDispatch is stable from useReducer
  const handleSearchChange = React.useCallback(
    (text: string) => filterDispatch({ type: 'SET_SEARCH', payload: text }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSearchClear = React.useCallback(
    () => filterDispatch({ type: 'SET_SEARCH', payload: '' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Load reference data (accounts and categories)
  const loadReferenceData = React.useCallback(async () => {
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountsService.listAccounts(),
        categoriesService.listCategories(false),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (err) {
      ErrorHandler.handle(err, 'Transactions.loadReferenceData');
    }
  }, [accountsService, categoriesService]);

  // Load transactions with filters
  const loadTransactions = React.useCallback(async () => {
    try {
      const filter: FilterParams = {};

      if (filterState.type) {
        filter.type = filterState.type;
      }
      if (filterState.accountId) {
        filter.accountId = filterState.accountId;
      }
      if (filterState.categoryId) {
        filter.categoryId = filterState.categoryId;
      }

      // F-050: Use custom date range if set, otherwise use month pagination
      if (filterState.startDate || filterState.endDate) {
        // B-001: Use date strings directly (YYYY-MM-DD format)
        filter.dateRange = {
          startDate: filterState.startDate || '1970-01-01',
          endDate: filterState.endDate || getTodayDateString(),
        };
      } else {
        // F-050: Default to current month
        filter.dateRange = {
          startDate: getMonthStartDateString(filterState.currentYear, filterState.currentMonth),
          endDate: getMonthEndDateString(filterState.currentYear, filterState.currentMonth),
        };
      }

      const data = await transactionsService.listTransactions(filter);

      setTransactions(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load transactions';
      setError(errorMessage);
    }
  }, [
    transactionsService,
    filterState.type,
    filterState.accountId,
    filterState.categoryId,
    filterState.startDate,
    filterState.endDate,
    filterState.currentMonth,
    filterState.currentYear,
  ]);

  // Client-side search filter - applied instantly without API call
  const filteredTransactions = React.useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return transactions;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return transactions.filter((t) => {
      // Search in notes
      if (t.notes && t.notes.toLowerCase().includes(query)) {
        return true;
      }
      // Search in category name
      const category = categoryMap.get(t.categoryId || '');
      if (category && category.name.toLowerCase().includes(query)) {
        return true;
      }
      // Search in account name
      const account = accountMap.get(t.accountId);
      if (account && account.name.toLowerCase().includes(query)) {
        return true;
      }
      // Search in amount (convert to string for searching)
      const amountStr = t.amount.toString();
      if (amountStr.includes(query)) {
        return true;
      }
      return false;
    });
  }, [transactions, debouncedSearchQuery, categoryMap, accountMap]);

  // Load data when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const load = async () => {
        setIsLoading(true);
        await loadReferenceData();
        if (isMounted) {
          await loadTransactions();
          setIsLoading(false);
        }
      };

      void load();

      return () => {
        isMounted = false;
      };
    }, [loadReferenceData, loadTransactions])
  );

  // Pull to refresh
  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await loadReferenceData();
    await loadTransactions();
    setIsRefreshing(false);
  }, [loadReferenceData, loadTransactions]);

  // Clear all filters
  const clearFilters = React.useCallback(() => {
    filterDispatch({ type: 'CLEAR_ALL' });
  }, [filterDispatch]);

  // Open date range modal with current values
  const openDateRangeModal = () => {
    setTempStartDate(filterState.startDate);
    setTempEndDate(filterState.endDate);
    setActiveModal('dateRange');
  };

  // Apply date range from modal
  const applyDateRange = () => {
    filterDispatch({
      type: 'SET_DATE_RANGE',
      payload: { startDate: tempStartDate, endDate: tempEndDate },
    });
    setActiveModal(null);
  };

  // Delete transaction handler
  const handleDelete = React.useCallback(
    (transaction: Transaction) => {
      const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : undefined;
      const categoryName = category?.name || 'this transaction';
      Alert.alert(
        'Delete Transaction',
        `Are you sure you want to delete "${categoryName}" (${formatCurrency(transaction.amount, transaction.currency)})? The balance will be reverted.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await transactionsService.deleteTransaction(transaction.id);
                await loadTransactions();
              } catch (err) {
                const errorMessage = err instanceof AppError
                  ? err.getUserMessage()
                  : 'Failed to delete transaction';
                setError(errorMessage);
              }
            },
          },
        ]
      );
    },
    [transactionsService, loadTransactions, categoryMap]
  );

  // Get badge color based on transaction type
  const getBadgeColor = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return theme.colors.success;
      case 'expense':
        return theme.colors.danger;
      case 'transfer':
        return theme.colors.secondary;
    }
  };

  // Format transaction value with appropriate sign
  const formatTransactionValue = (transaction: Transaction) => {
    const account = accountMap.get(transaction.accountId);
    const currency = account?.currency || transaction.currency;
    const formatted = formatCurrency(transaction.amount, currency);

    if (transaction.type === 'income') {
      return `+${formatted}`;
    } else if (transaction.type === 'expense') {
      return `-${formatted}`;
    }
    return formatted;
  };

  // Get transaction subtitle
  const getTransactionSubtitle = (transaction: Transaction) => {
    const account = accountMap.get(transaction.accountId);
    const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : undefined;
    const parts: string[] = [];

    if (account) {
      parts.push(account.name);
    }

    if (transaction.type === 'transfer' && transaction.toAccountId) {
      const toAccount = accountMap.get(transaction.toAccountId);
      if (toAccount) {
        parts[0] = `${account?.name || 'Unknown'} → ${toAccount.name}`;
      }
    }

    if (category) {
      parts.push(category.icon ? `${category.icon} ${category.name}` : category.name);
    }

    return parts.join(' • ');
  };

  // Render transaction item
  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    // For transfers, show "Transfer" instead of category name
    let displayTitle: string;
    if (transaction.type === 'transfer') {
      displayTitle = 'Transfer';
    } else {
      const category = categoryMap.get(transaction.categoryId || '');
      displayTitle = category
        ? (category.icon ? `${category.icon} ${category.name}` : category.name)
        : 'Uncategorized';
    }

    return (
      <View style={styles.transactionItem}>
        <TouchableOpacity
          style={styles.transactionContent}
          onPress={() => router.push(`/edit-transaction?id=${transaction.id}`)}
        >
          <View style={styles.transactionMain}>
            <Text style={styles.transactionTitle}>{displayTitle}</Text>
            <Text style={styles.transactionSubtitle}>
              {/* F-052: Date removed since day header shows it */}
              {getTransactionSubtitle(transaction)}{transaction.notes ? ` • ${transaction.notes}` : ''}
            </Text>
          </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              {
                color:
                  transaction.type === 'income'
                    ? theme.colors.success
                    : transaction.type === 'expense'
                    ? theme.colors.danger
                    : theme.colors.textPrimary,
              },
            ]}
          >
            {formatTransactionValue(transaction)}
          </Text>
          <View style={[styles.badge, { backgroundColor: getBadgeColor(transaction.type) }]}>
            <Text style={styles.badgeText}>
              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.transactionActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/edit-transaction?id=${transaction.id}`)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(transaction)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  // F-051: Calculate monthly summary from loaded transactions
  const monthlySummary = React.useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of filteredTransactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;
      }
      // Transfers are excluded from summary
    }

    // F-053: Calculate actual account balance (not filtered by date)
    let totalBalance = 0;
    if (filterState.accountId) {
      // Show balance of selected account
      const account = accountMap.get(filterState.accountId);
      totalBalance = account?.balance || 0;
    } else {
      // Show sum of all account balances
      for (const account of accounts) {
        totalBalance += account.balance;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netTotal: totalIncome - totalExpenses,
      totalBalance,
    };
  }, [filteredTransactions, filterState.accountId, accountMap, accounts]);

  // Build summary items for SummaryCard
  const summaryItems: SummaryItem[] = React.useMemo(() => {
    const items: SummaryItem[] = [
      { label: 'Income', value: monthlySummary.totalIncome, type: 'income' },
      { label: 'Expenses', value: monthlySummary.totalExpenses, type: 'expense' },
      { label: 'Net', value: monthlySummary.netTotal, type: 'net' },
    ];

    // F-053: Only show Balance when viewing account-specific transactions
    if (filterState.accountId) {
      items.push({ label: 'Balance', value: monthlySummary.totalBalance, type: 'default' });
    }

    return items;
  }, [monthlySummary, filterState.accountId]);

  // F-052: Group transactions by day for SectionList
  const dailyGroups = React.useMemo((): DailyGroup[] => {
    const groups = new Map<string, DailyGroup>();

    for (const tx of filteredTransactions) {
      const date = tx.date; // YYYY-MM-DD

      if (!groups.has(date)) {
        const dateObj = new Date(date + 'T00:00:00');
        groups.set(date, {
          date,
          dayNumber: date.slice(8, 10), // "05"
          weekday: WEEKDAYS[dateObj.getDay()],
          data: [],
          dayIncome: 0,
          dayExpenses: 0,
        });
      }

      const group = groups.get(date)!;
      group.data.push(tx);

      if (tx.type === 'income') {
        group.dayIncome += tx.amount;
      } else if (tx.type === 'expense') {
        group.dayExpenses += tx.amount;
      }
    }

    // Sort by date descending (most recent first)
    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  // F-052: Render day section header
  const renderSectionHeader = ({ section }: { section: DailyGroup }) => (
    <View style={styles.dayHeader}>
      <Text style={styles.dayHeaderDate}>
        {section.dayNumber} {section.weekday}
      </Text>
      <View style={styles.dayHeaderTotals}>
        {section.dayIncome > 0 && (
          <Text style={[styles.dayHeaderAmount, { color: theme.colors.success }]}>
            +{formatCurrency(section.dayIncome)}
          </Text>
        )}
        {section.dayExpenses > 0 && (
          <Text style={[styles.dayHeaderAmount, { color: theme.colors.danger }]}>
            -{formatCurrency(section.dayExpenses)}
          </Text>
        )}
      </View>
    </View>
  );

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {derived.activeFilterCount > 0 || filterState.searchQuery
          ? 'No transactions found'
          : `No transactions for ${derived.labels.month}`}
      </Text>
      <Text style={styles.emptyDescription}>
        {derived.activeFilterCount > 0 || filterState.searchQuery
          ? 'Try adjusting your filters or clear them to see all transactions.'
          : 'Add a transaction or navigate to a different month.'}
      </Text>
      {derived.activeFilterCount > 0 || filterState.searchQuery ? (
        <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
          <Text style={styles.emptyButtonText}>Clear filters</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.push({ pathname: '/add-transaction', params: { source: 'transactions' } })}>
          <Text style={styles.emptyButtonText}>Add transaction</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render search bar separately to prevent TextInput from losing focus
  const renderSearchBar = () => (
    <SearchBar
      value={filterState.searchQuery}
      onChangeText={handleSearchChange}
      onClear={handleSearchClear}
      theme={theme}
      styles={styles}
    />
  );

  // Render header with all components
  // SearchBar is rendered via renderSearchBar to prevent focus loss
  const renderHeader = React.useMemo(() => (
    <View style={styles.headerSection}>
      {/* F-050: Month Navigator - only show when custom date filter is not active */}
      {!filterState.startDate && !filterState.endDate && (
        <MonthNavigator
          month={filterState.currentMonth}
          year={filterState.currentYear}
          onNavigate={(direction) => filterDispatch({ type: 'NAVIGATE_MONTH', payload: direction })}
          style={styles.monthNav}
        />
      )}

      {/* F-053: Account Context Banner */}
      {filterState.accountId && accountMap.get(filterState.accountId) && (
        <View style={styles.accountBanner}>
          <Text style={styles.accountBannerText}>
            Viewing: {accountMap.get(filterState.accountId)?.name}
          </Text>
          <TouchableOpacity
            onPress={() => filterDispatch({ type: 'SET_ACCOUNT', payload: '' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.accountBannerClear}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* F-051: Monthly Summary Bar */}
      <SummaryCard items={summaryItems} style={styles.summaryBar} />

      {/* Search bar - rendered separately to prevent focus loss */}
      {renderSearchBar()}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContainer}
      >
        <FilterChip
          label={derived.labels.type}
          isActive={!!filterState.type}
          onPress={() => setActiveModal('type')}
          onClear={filterState.type ? () => filterDispatch({ type: 'SET_TYPE', payload: '' }) : undefined}
        />
        <FilterChip
          label={derived.labels.account}
          isActive={!!filterState.accountId}
          onPress={() => setActiveModal('account')}
          onClear={filterState.accountId ? () => filterDispatch({ type: 'SET_ACCOUNT', payload: '' }) : undefined}
        />
        <FilterChip
          label={derived.labels.category}
          isActive={!!filterState.categoryId}
          onPress={() => setActiveModal('category')}
          onClear={filterState.categoryId ? () => filterDispatch({ type: 'SET_CATEGORY', payload: '' }) : undefined}
        />
        <FilterChip
          label={derived.labels.dateRange}
          isActive={!!(filterState.startDate || filterState.endDate)}
          onPress={openDateRangeModal}
          onClear={
            (filterState.startDate || filterState.endDate)
              ? () => filterDispatch({ type: 'SET_DATE_RANGE', payload: { startDate: '', endDate: '' } })
              : undefined
          }
        />
        {derived.activeFilterCount > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  ), [
    filterState.startDate,
    filterState.endDate,
    filterState.currentMonth,
    filterState.currentYear,
    filterState.accountId,
    filterState.type,
    filterState.categoryId,
    derived.labels.type,
    derived.labels.account,
    derived.labels.category,
    derived.labels.dateRange,
    derived.activeFilterCount,
    accountMap,
    summaryItems,
    filterDispatch,
    styles,
    theme,
    setActiveModal,
    renderSearchBar,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {renderHeader}

      {/* F-052: SectionList grouped by day */}
      <SectionList
        sections={dailyGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        stickySectionHeadersEnabled={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/add-transaction', params: { source: 'transactions' } })}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modals */}
      <SelectionModal
        visible={activeModal === 'type'}
        title="Select Type"
        options={TYPE_OPTIONS}
        selectedValue={filterState.type}
        onSelect={(value) => {
          filterDispatch({ type: 'SET_TYPE', payload: value });
          setActiveModal(null);
        }}
        onClose={() => setActiveModal(null)}
      />

      <SelectionModal
        visible={activeModal === 'account'}
        title="Select Account"
        options={[
          { label: 'All Accounts', value: '' },
          ...accounts.map((a) => ({ label: a.name, value: a.id })),
        ]}
        selectedValue={filterState.accountId}
        onSelect={(value) => {
          filterDispatch({ type: 'SET_ACCOUNT', payload: value });
          setActiveModal(null);
        }}
        onClose={() => setActiveModal(null)}
      />

      <SelectionModal
        visible={activeModal === 'category'}
        title="Select Category"
        options={[
          { label: 'All Categories', value: '' },
          ...flattenedCategories.map((c) => ({ label: c.label, value: c.id })),
        ]}
        selectedValue={filterState.categoryId}
        onSelect={(value) => {
          filterDispatch({ type: 'SET_CATEGORY', payload: value });
          setActiveModal(null);
        }}
        onClose={() => setActiveModal(null)}
      />

      <DateRangeModal
        visible={activeModal === 'dateRange'}
        startDate={tempStartDate}
        endDate={tempEndDate}
        onStartDateChange={setTempStartDate}
        onEndDateChange={setTempEndDate}
        onApply={applyDateRange}
        onClose={() => setActiveModal(null)}
      />
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
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: theme.spacing.md,
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#fcc',
    },
    errorText: {
      color: '#c00',
      fontWeight: fontWeight(500),
    },
    // Header section with search and filters
    headerSection: {
      paddingBottom: theme.spacing.md,
    },
    monthNav: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    // F-053: Account context banner styles
    accountBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: `${theme.colors.primary}15`,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    accountBannerText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    accountBannerClear: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.primary,
    },
    // F-051: Monthly summary bar styles
    summaryBar: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      height: 40,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    },
    searchClear: {
      paddingHorizontal: theme.spacing.md,
    },
    searchClearText: {
      fontSize: 20,
      color: theme.colors.textSecondary,
    },
    // Filter chips
    filterChipsContainer: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
      flexDirection: 'row',
    },
    clearAllButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    clearAllText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
    // List styles
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: 100,
    },
    transactionItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    transactionContent: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    transactionMain: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    transactionSubtitle: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    transactionRight: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    transactionAmount: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: fontWeight(600),
      color: '#ffffff',
    },
    transactionActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.primary,
    },
    deleteButton: {
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
    },
    deleteButtonText: {
      color: theme.colors.danger,
    },
    // F-052: Day header styles
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background,
      marginTop: theme.spacing.md,
    },
    dayHeaderDate: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    dayHeaderTotals: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    dayHeaderAmount: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
    },
    transactionSeparator: {
      height: theme.spacing.sm,
    },
    sectionSeparator: {
      height: theme.spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: fontWeight(theme.typography.h2.fontWeight),
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    emptyButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
    },
    emptyButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.lg,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    fabText: {
      fontSize: 28,
      color: '#ffffff',
      fontWeight: fontWeight(300),
    },
  });
