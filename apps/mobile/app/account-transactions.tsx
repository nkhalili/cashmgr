import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TextStyle,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  Transaction,
  TransactionType,
  AppError,
  ErrorHandler,
  formatCurrency,
  formatDate,
  getMonthStartDateString,
  getMonthEndDateString,
  getTodayDateString,
} from '@cashmgr/core';
import type { FilterParams } from '@cashmgr/core';
import {
  useAccountsService,
  useCategoriesService,
  useTransactionsService,
} from '../src/contexts/services-context';
import { DateInput } from '../src/components/DateInput';

// F-052: Daily group interface
interface DailyGroup {
  date: string;
  displayDate: string;
  data: Transaction[];
  dayIncome: number;
  dayExpenses: number;
}

type ModalType = 'type' | 'category' | 'dateRange' | null;

const TYPE_OPTIONS: { label: string; value: TransactionType | '' }[] = [
  { label: 'All Types', value: '' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
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

// F-053: Account-specific transactions screen
export default function AccountTransactionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();
  const transactionsService = useTransactionsService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Data state
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // UI state
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeModal, setActiveModal] = React.useState<ModalType>(null);

  // Filter state
  const [filterType, setFilterType] = React.useState<TransactionType | ''>('');
  const [filterCategoryId, setFilterCategoryId] = React.useState('');
  const [filterStartDate, setFilterStartDate] = React.useState('');
  const [filterEndDate, setFilterEndDate] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');

  // Temp state for date range modal
  const [tempStartDate, setTempStartDate] = React.useState('');
  const [tempEndDate, setTempEndDate] = React.useState('');

  // F-050: Month pagination state
  const now = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(now.getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = React.useState(now.getFullYear());

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper maps
  const accountMap = React.useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  const categoryMap = React.useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Memoized search callbacks to prevent SearchBar from re-rendering
  const handleSearchChange = React.useCallback(
    (text: string) => setSearchQuery(text),
    []
  );

  const handleSearchClear = React.useCallback(
    () => setSearchQuery(''),
    []
  );

  // Get selected account
  const selectedAccount = accountMap.get(accountId || '');

  // F-050: Month names
  const FULL_MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Load reference data on mount
  React.useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [accountsData, categoriesData] = await Promise.all([
          accountsService.listAccounts(),
          categoriesService.listCategories(),
        ]);
        setAccounts(accountsData);
        setCategories(categoriesData);
      } catch (err) {
        ErrorHandler.handle(err, 'AccountTransactions.loadReferenceData');
      }
    };
    void loadReferenceData();
  }, [accountsService, categoriesService]);

  // Load transactions based on filters
  const loadTransactions = React.useCallback(async () => {
    if (!accountId) return;

    try {
      const filter: FilterParams = {
        accountId,
      };

      if (filterType) {
        filter.type = filterType;
      }
      if (filterCategoryId) {
        filter.categoryId = filterCategoryId;
      }

      // Use custom date range if set, otherwise use month pagination
      if (filterStartDate || filterEndDate) {
        filter.dateRange = {
          startDate: filterStartDate || '1970-01-01',
          endDate: filterEndDate || getTodayDateString(),
        };
      } else {
        filter.dateRange = {
          startDate: getMonthStartDateString(currentYear, currentMonth),
          endDate: getMonthEndDateString(currentYear, currentMonth),
        };
      }

      const data = await transactionsService.listTransactions(filter);

      // Client-side search filter by notes, category name, account name, and amount
      let filtered = data;
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        filtered = data.filter((t) => {
          // Search in notes
          if (t.notes && t.notes.toLowerCase().includes(query)) {
            return true;
          }
          // Search in category name
          const category = categoryMap.get(t.categoryId || '');
          if (category && category.name.toLowerCase().includes(query)) {
            return true;
          }
          // Search in account name (though in this screen, all transactions are from the same account)
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
      }

      setTransactions(filtered);
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load transactions';
      setError(errorMessage);
    } finally {
      setIsInitialLoading(false);
    }
  }, [
    accountId,
    transactionsService,
    filterType,
    filterCategoryId,
    filterStartDate,
    filterEndDate,
    currentYear,
    currentMonth,
    debouncedSearchQuery,
  ]);

  React.useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await loadTransactions();
    setIsRefreshing(false);
  }, [loadTransactions]);

  // F-050: Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    }
  };

  // F-051: Monthly summary calculation
  const monthlySummary = React.useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;
      }
    }

    const totalBalance = selectedAccount?.balance || 0;

    return {
      totalIncome,
      totalExpenses,
      netTotal: totalIncome - totalExpenses,
      totalBalance,
    };
  }, [transactions, selectedAccount]);

  // Count active filters (excluding account since it's fixed)
  const activeFilters = [filterType, filterCategoryId, filterStartDate, filterEndDate].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setFilterType('');
    setFilterCategoryId('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Get display labels for filters
  const getTypeLabel = () => {
    if (!filterType) return 'Type';
    return TYPE_OPTIONS.find((o) => o.value === filterType)?.label || 'Type';
  };

  const getCategoryLabel = () => {
    if (!filterCategoryId) return 'Category';
    const cat = categoryMap.get(filterCategoryId);
    return cat ? (cat.icon ? `${cat.icon} ${cat.name}` : cat.name) : 'Category';
  };

  const getDateRangeLabel = () => {
    if (!filterStartDate && !filterEndDate) return 'Date';
    if (filterStartDate && filterEndDate) return `${filterStartDate} - ${filterEndDate}`;
    if (filterStartDate) return `From ${filterStartDate}`;
    return `Until ${filterEndDate}`;
  };

  const openDateRangeModal = () => {
    setTempStartDate(filterStartDate);
    setTempEndDate(filterEndDate);
    setActiveModal('dateRange');
  };

  // Apply date range from modal
  const applyDateRange = () => {
    setFilterStartDate(tempStartDate);
    setFilterEndDate(tempEndDate);
    setActiveModal(null);
  };

  // Delete transaction handler
  const handleDelete = React.useCallback(
    async (transaction: Transaction) => {
      Alert.alert(
        'Delete Transaction',
        'Are you sure you want to delete this transaction?',
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
                const errorMessage =
                  err instanceof AppError ? err.getUserMessage() : 'Failed to delete transaction';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    },
    [transactionsService, loadTransactions]
  );

  // Render filter chip
  const renderFilterChip = (
    label: string,
    isActive: boolean,
    onPress: () => void,
    onClear?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {isActive && onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.filterChipClear}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Render selection modal
  const renderModal = () => {
    if (!activeModal) return null;

    let title = '';
    let options: { label: string; value: string }[] = [];
    let currentValue = '';
    let onSelect: (value: string) => void = () => {};

    switch (activeModal) {
      case 'type':
        title = 'Select Type';
        options = TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
        currentValue = filterType;
        onSelect = (value) => {
          setFilterType(value as TransactionType | '');
          setActiveModal(null);
        };
        break;
      case 'category':
        title = 'Select Category';
        options = [
          { label: 'All Categories', value: '' },
          ...categories.map((c) => ({
            label: c.icon ? `${c.icon} ${c.name}` : c.name,
            value: c.id,
          })),
        ];
        currentValue = filterCategoryId;
        onSelect = (value) => {
          setFilterCategoryId(value);
          setActiveModal(null);
        };
        break;
      case 'dateRange':
        // Date range has a different UI with calendar pickers
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
            <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>Date Range</Text>
                <View style={styles.dateInputContainer}>
                  <DateInput
                    label="Start Date"
                    value={tempStartDate}
                    onChange={setTempStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <DateInput
                    label="End Date"
                    value={tempEndDate}
                    onChange={setTempEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelButton} onPress={() => setActiveModal(null)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalApplyButton} onPress={applyDateRange}>
                    <Text style={styles.modalApplyText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Modal>
        );
    }

    return (
      <Modal visible transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => {
                const isSelected = currentValue === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                    onPress={() => onSelect(option.value)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    );
  };

  // F-052: Group transactions by day
  const dailyGroups = React.useMemo((): DailyGroup[] => {
    const groups = new Map<string, DailyGroup>();

    for (const tx of transactions) {
      const date = tx.date; // YYYY-MM-DD

      if (!groups.has(date)) {
        groups.set(date, {
          date,
          displayDate: formatDate(date),
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

    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  // Render transaction item
  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    const account = accountMap.get(transaction.accountId);
    const category = categoryMap.get(transaction.categoryId || '');

    // For transfers, show "Transfer" instead of category name
    let displayTitle: string;
    if (transaction.type === 'transfer') {
      displayTitle = 'Transfer';
    } else {
      displayTitle = category
        ? (category.icon ? `${category.icon} ${category.name}` : category.name)
        : 'Uncategorized';
    }

    const getSubtitle = () => {
      const parts: string[] = [];

      if (transaction.type === 'transfer') {
        const toAccount = accountMap.get(transaction.toAccountId || '');
        if (toAccount) {
          parts.push(`To ${toAccount.name}`);
        }
      } else {
        parts.push(account?.name || 'Unknown');
      }

      if (transaction.notes) {
        parts.push(transaction.notes);
      }

      return parts.join(' • ');
    };

    return (
      <View style={styles.transactionItem}>
        <TouchableOpacity
          style={styles.transactionContent}
          onPress={() => router.push(`/edit-transaction?id=${transaction.id}`)}
        >
          <View style={styles.transactionMain}>
            <Text style={styles.transactionTitle}>{displayTitle}</Text>
            <Text style={styles.transactionSubtitle}>{getSubtitle()}</Text>
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
              {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
              {formatCurrency(transaction.amount, account?.currency)}
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

  // Get badge color helper
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'income':
        return theme.colors.success;
      case 'expense':
        return theme.colors.danger;
      case 'transfer':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  // F-052: Render section header (day header)
  const renderSectionHeader = ({ section }: { section: DailyGroup }) => (
    <View style={styles.dayHeader}>
      <Text style={styles.dayHeaderDate}>{section.displayDate}</Text>
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

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No transactions for {FULL_MONTHS[currentMonth - 1]}</Text>
    </View>
  );

  // Render search bar separately to prevent TextInput from losing focus
  const renderSearchBar = () => (
    <SearchBar
      value={searchQuery}
      onChangeText={handleSearchChange}
      onClear={handleSearchClear}
      theme={theme}
      styles={styles}
    />
  );

  // Memoize header section excluding search (which is rendered via renderSearchBar)
  const renderHeaderSection = React.useMemo(() => (
    <View style={styles.headerSection}>
      {/* F-050: Month Navigator */}
      <View style={styles.monthNavCard}>
        <TouchableOpacity style={styles.monthNavButton} onPress={() => navigateMonth('prev')}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthNavLabel}>
          {FULL_MONTHS[currentMonth - 1]} {currentYear}
        </Text>
        <TouchableOpacity style={styles.monthNavButton} onPress={() => navigateMonth('next')}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Account Context Banner */}
      {selectedAccount && (
        <View style={styles.accountBanner}>
          <Text style={styles.accountBannerText}>
            Viewing: {selectedAccount.name}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.accountBannerClear}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* F-051: Monthly Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
            +{formatCurrency(monthlySummary.totalIncome)}
          </Text>
          <Text style={styles.summaryLabel}>Income</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryAmount, { color: theme.colors.danger }]}>
            -{formatCurrency(monthlySummary.totalExpenses)}
          </Text>
          <Text style={styles.summaryLabel}>Expenses</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text
            style={[
              styles.summaryAmount,
              {
                color:
                  monthlySummary.netTotal < 0
                    ? theme.colors.danger
                    : theme.colors.textPrimary,
              },
            ]}
          >
            {monthlySummary.netTotal >= 0 ? '+' : ''}
            {formatCurrency(monthlySummary.netTotal)}
          </Text>
          <Text style={styles.summaryLabel}>Net</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryAmount, { color: theme.colors.textPrimary }]}>
            {formatCurrency(monthlySummary.totalBalance)}
          </Text>
          <Text style={styles.summaryLabel}>Balance</Text>
        </View>
      </View>

      {/* Search bar - rendered separately to prevent focus loss */}
      {renderSearchBar()}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContainer}
      >
        {renderFilterChip(
          getTypeLabel(),
          !!filterType,
          () => setActiveModal('type'),
          filterType ? () => setFilterType('') : undefined
        )}
        {renderFilterChip(
          getCategoryLabel(),
          !!filterCategoryId,
          () => setActiveModal('category'),
          filterCategoryId ? () => setFilterCategoryId('') : undefined
        )}
        {renderFilterChip(
          getDateRangeLabel(),
          !!(filterStartDate || filterEndDate),
          openDateRangeModal,
          (filterStartDate || filterEndDate)
            ? () => {
                setFilterStartDate('');
                setFilterEndDate('');
              }
            : undefined
        )}
        {activeFilters > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  ), [
    currentMonth,
    currentYear,
    selectedAccount,
    monthlySummary,
    filterType,
    filterCategoryId,
    filterStartDate,
    filterEndDate,
    activeFilters,
    theme,
    styles,
    renderSearchBar,
  ]);

  if (isInitialLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: selectedAccount?.name || 'Transactions',
            headerBackTitle: 'Accounts',
          }}
        />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: selectedAccount?.name || 'Transactions',
          headerBackTitle: 'Accounts',
        }}
      />
      <View style={styles.container}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Render memoized header section */}
        {renderHeaderSection}

        {/* F-052: SectionList grouped by day */}
        <SectionList
          sections={dailyGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
          stickySectionHeadersEnabled={false}
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push({ pathname: '/add-transaction', params: { accountId, source: 'account-transactions' } })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {renderModal()}
      </View>
    </>
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
    headerSection: {
      paddingBottom: theme.spacing.md,
    },
    monthNavCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    monthNavButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthNavLabel: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
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
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryAmount: {
      fontSize: 13,
      fontWeight: fontWeight(600),
    },
    summaryLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    summaryDivider: {
      width: 1,
      height: 36,
      backgroundColor: theme.colors.border,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: 100,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body.fontSize,
      textAlign: 'center',
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background,
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
      fontWeight: fontWeight(500),
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
      justifyContent: 'center',
    },
    deleteButton: {
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
    },
    actionButtonText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
    deleteButtonText: {
      color: theme.colors.danger,
    },
    transactionSeparator: {
      height: theme.spacing.md,
    },
    sectionSeparator: {
      height: theme.spacing.md,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.lg,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
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
      padding: theme.spacing.xs,
    },
    searchClearText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(300),
    },
    filterChipsContainer: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
      flexDirection: 'row',
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
      maxWidth: 150,
      height: 28,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    filterChipTextActive: {
      color: '#ffffff',
    },
    filterChipClear: {
      fontSize: 16,
      color: '#ffffff',
      marginLeft: 2,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 400,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: fontWeight(theme.typography.h2.fontWeight),
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    optionsList: {
      maxHeight: 300,
    },
    optionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionItemSelected: {
      backgroundColor: `${theme.colors.primary}15`,
    },
    optionText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    optionTextSelected: {
      fontWeight: fontWeight(600),
      color: theme.colors.primary,
    },
    checkmark: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
    dateInputContainer: {
      marginBottom: theme.spacing.md,
    },
    dateInputLabel: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
      fontWeight: fontWeight(600),
      marginBottom: theme.spacing.xs,
    },
    dateInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    },
    modalActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(600),
    },
    modalApplyButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    modalApplyText: {
      fontSize: theme.typography.body.fontSize,
      color: '#ffffff',
      fontWeight: fontWeight(600),
    },
  });
