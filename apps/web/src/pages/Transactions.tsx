import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, DateInput, EmptyState, ListItem, useTheme } from '@cashmgr/ui';
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
} from '../services/services-context';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import { MonthNavigator } from '../components/MonthNavigator';
import { SummaryCard } from '../components/SummaryCard';

const TYPE_OPTIONS: { label: string; value: TransactionType | '' }[] = [
  { label: 'All Types', value: '' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
];

// F-052: Weekday abbreviations for daily grouping
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// F-052: Daily group structure
interface DailyGroup {
  date: string;           // YYYY-MM-DD
  dayNumber: string;      // "05", "12", etc. (zero-padded)
  weekday: string;        // "Mon", "Tue", etc.
  transactions: Transaction[];
  dayIncome: number;
  dayExpenses: number;
}

/**
 * F-002: Transactions List Page
 * Displays all transactions with filtering, search, and CRUD actions
 */
export function Transactions() {
  const theme = useTheme();
  const navigate = useNavigate();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();
  const transactionsService = useTransactionsService();

  // Data state
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // UI state
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);

  // Filter state management with URL sync
  const { state: filterState, dispatch: filterDispatch, derived, debouncedSearchQuery } =
    useTransactionFilters(accounts, categories);

  // Helper maps for looking up account/category names
  const accountMap = React.useMemo(() => {
    return new Map(accounts.map(a => [a.id, a]));
  }, [accounts]);

  const categoryMap = React.useMemo(() => {
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  // Load reference data
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [accountsData, categoriesData] = await Promise.all([
          accountsService.listAccounts(),
          categoriesService.listCategories(false), // Include inactive for historical transactions
        ]);
        setAccounts(accountsData);
        setCategories(categoriesData);
      } catch (err) {
        ErrorHandler.handle(err, 'Transactions.loadReferenceData');
      }
    };
    void loadData();
  }, [accountsService, categoriesService]);

  // Load transactions with filters
  const loadTransactions = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
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

      // Client-side search filter
      let filtered = data;
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        filtered = data.filter(t => {
          // Search in notes
          if (t.notes && t.notes.toLowerCase().includes(query)) {
            return true;
          }
          // Search in category name
          const category = t.categoryId ? categoryMap.get(t.categoryId) : undefined;
          if (category && category.name.toLowerCase().includes(query)) {
            return true;
          }
          // Search in account name
          const account = accountMap.get(t.accountId);
          if (account && account.name.toLowerCase().includes(query)) {
            return true;
          }
          // Search in amount
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
      setIsLoading(false);
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
    debouncedSearchQuery,
    categoryMap,
    accountMap,
  ]);

  React.useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  // Delete transaction handler
  const handleDelete = React.useCallback(
    async (transaction: Transaction) => {
      const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : undefined;
      const label = category?.name || 'this transaction';
      const confirmed = window.confirm(
        `Are you sure you want to delete "${label}" (${formatCurrency(transaction.amount)})? The balance will be reverted.`
      );

      if (!confirmed) return;

      setError(null);

      try {
        await transactionsService.deleteTransaction(transaction.id);
        await loadTransactions();
      } catch (err) {
        const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to delete transaction';
        setError(errorMessage);
      }
    },
    [transactionsService, loadTransactions, categoryMap],
  );

  // Clear all filters
  const clearFilters = React.useCallback(() => {
    filterDispatch({ type: 'CLEAR_ALL' });
  }, [filterDispatch]);

  // F-051: Calculate monthly summary from loaded transactions
  const monthlySummary = React.useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
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
  }, [transactions, filterState.accountId, accountMap, accounts]);

  // F-052: Group transactions by day
  const dailyGroups = React.useMemo((): DailyGroup[] => {
    const groups = new Map<string, DailyGroup>();

    for (const tx of transactions) {
      const date = tx.date; // YYYY-MM-DD

      if (!groups.has(date)) {
        const dateObj = new Date(date + 'T00:00:00');
        groups.set(date, {
          date,
          dayNumber: date.slice(8, 10), // "05"
          weekday: WEEKDAYS[dateObj.getDay()],
          transactions: [],
          dayIncome: 0,
          dayExpenses: 0,
        });
      }

      const group = groups.get(date)!;
      group.transactions.push(tx);

      if (tx.type === 'income') {
        group.dayIncome += tx.amount;
      } else if (tx.type === 'expense') {
        group.dayExpenses += tx.amount;
      }
    }

    // Sort by date descending (most recent first)
    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  // Get badge tone based on transaction type
  const getBadgeTone = (type: TransactionType): 'success' | 'danger' | 'accent' => {
    switch (type) {
      case 'income':
        return 'success';
      case 'expense':
        return 'danger';
      case 'transfer':
        return 'accent';
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

  const selectStyle: React.CSSProperties = {
    height: theme.components.inputHeight,
    borderRadius: theme.components.interactiveRadius,
    border: `1px solid ${theme.colors.border}`,
    fontFamily: theme.fontFamily,
    fontSize: theme.typography.body.fontSize,
    padding: `0 ${theme.spacing.sm}px`,
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    flex: 1,
    minWidth: 120,
  };

  const hasTransactions = transactions.length > 0;

  // Prepare summary items for SummaryCard
  const summaryItems: Array<{ label: string; value: number; type: 'income' | 'expense' | 'net' | 'balance' }> = [
    { label: 'Income', value: monthlySummary.totalIncome, type: 'income' },
    { label: 'Expenses', value: monthlySummary.totalExpenses, type: 'expense' },
    { label: 'Net', value: monthlySummary.netTotal, type: 'net' },
  ];

  // Add balance if viewing specific account
  if (filterState.accountId) {
    summaryItems.push({
      label: 'Balance',
      value: monthlySummary.totalBalance,
      type: 'balance',
    });
  }

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: theme.typography.h1.fontSize,
              fontWeight: theme.typography.h1.fontWeight,
            }}
          >
            Transactions
          </h2>
          <p style={{ marginTop: theme.spacing.xs, color: theme.colors.textSecondary }}>
            {isLoading ? 'Loading...' : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/transactions/add')}>
          Add transaction
        </Button>
      </div>

      {/* F-050: Month Navigator - only show when custom date filter is not active */}
      {!filterState.startDate && !filterState.endDate && (
        <MonthNavigator
          monthLabel={derived.labels.month}
          onPrevMonth={() => filterDispatch({ type: 'NAVIGATE_MONTH', payload: 'prev' })}
          onNextMonth={() => filterDispatch({ type: 'NAVIGATE_MONTH', payload: 'next' })}
        />
      )}

      {/* F-053: Account Context Banner */}
      {filterState.accountId && accountMap.get(filterState.accountId) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.primary + '15',
            border: `1px solid ${theme.colors.primary}`,
            borderRadius: theme.components.interactiveRadius,
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textPrimary,
            }}
          >
            Viewing: {accountMap.get(filterState.accountId)?.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              filterDispatch({ type: 'SET_ACCOUNT', payload: '' });
              navigate('/transactions');
            }}
          >
            View all accounts
          </Button>
        </div>
      )}

      {/* F-051: Monthly Summary Bar */}
      <SummaryCard items={summaryItems} />

      {error && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: theme.components.interactiveRadius,
            color: '#c00',
          }}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {/* Collapsible Filters */}
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.components.interactiveRadius,
          border: `1px solid ${theme.colors.border}`,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.md,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: theme.fontFamily,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <span style={{ fontWeight: 600, color: theme.colors.textPrimary }}>Filters</span>
            {derived.activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#fff',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {derived.activeFilterCount}
              </span>
            )}
          </div>
          <span style={{ color: theme.colors.textSecondary, fontSize: 20, fontWeight: 300 }}>
            {filtersExpanded ? '−' : '+'}
          </span>
        </button>

        {filtersExpanded && (
          <div style={{ padding: `0 ${theme.spacing.md}px ${theme.spacing.md}px`, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search transactions..."
                value={filterState.searchQuery}
                onChange={(e) => filterDispatch({ type: 'SET_SEARCH', payload: e.target.value })}
                style={{ ...selectStyle, flex: 2, minWidth: 200 }}
              />
              <select
                value={filterState.type}
                onChange={(e) => filterDispatch({ type: 'SET_TYPE', payload: e.target.value as TransactionType | '' })}
                style={selectStyle}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <select
                value={filterState.accountId}
                onChange={(e) => filterDispatch({ type: 'SET_ACCOUNT', payload: e.target.value })}
                style={selectStyle}
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <select
                value={filterState.categoryId}
                onChange={(e) => filterDispatch({ type: 'SET_CATEGORY', payload: e.target.value })}
                style={selectStyle}
              >
                <option value="">All Categories</option>
                {categories
                  .filter(c => !c.parentId)
                  .map((category) => (
                    <React.Fragment key={category.id}>
                      <option value={category.id}>
                        {category.icon ? `${category.icon} ` : ''}{category.name}
                      </option>
                      {categories
                        .filter(sub => sub.parentId === category.id)
                        .map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            &nbsp;&nbsp;{sub.icon ? `${sub.icon} ` : ''}{sub.name}
                          </option>
                        ))}
                    </React.Fragment>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <DateInput
                label="From Date"
                value={filterState.startDate}
                onChange={(value) => filterDispatch({
                  type: 'SET_DATE_RANGE',
                  payload: { startDate: value, endDate: filterState.endDate }
                })}
                style={{ flex: 1, minWidth: 150 }}
              />
              <span style={{ color: theme.colors.textSecondary, paddingBottom: theme.spacing.sm }}>to</span>
              <DateInput
                label="To Date"
                value={filterState.endDate}
                onChange={(value) => filterDispatch({
                  type: 'SET_DATE_RANGE',
                  payload: { startDate: filterState.startDate, endDate: value }
                })}
                style={{ flex: 1, minWidth: 150 }}
              />
              {derived.activeFilterCount > 0 && (
                <Button variant="ghost" onClick={clearFilters} style={{ marginBottom: 2 }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <Card title="Transaction history" subtitle="Click to view details" tone="default">
        {isLoading ? (
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>Loading transactions...</p>
        ) : hasTransactions ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* F-052: Render transactions grouped by day */}
            {dailyGroups.map((group, groupIndex) => (
              <div key={group.date}>
                {/* Day Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                    backgroundColor: theme.colors.background,
                    marginTop: groupIndex > 0 ? theme.spacing.md : 0,
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <span style={{ fontWeight: 600, color: theme.colors.textPrimary }}>
                    {group.dayNumber} {group.weekday}
                  </span>
                  <div style={{ display: 'flex', gap: theme.spacing.md }}>
                    {group.dayIncome > 0 && (
                      <span style={{ color: theme.colors.success, fontWeight: 600, fontSize: theme.typography.caption.fontSize }}>
                        +{formatCurrency(group.dayIncome)}
                      </span>
                    )}
                    {group.dayExpenses > 0 && (
                      <span style={{ color: theme.colors.danger, fontWeight: 600, fontSize: theme.typography.caption.fontSize }}>
                        -{formatCurrency(group.dayExpenses)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Day's Transactions */}
                {group.transactions.map((transaction, txIndex) => (
                  <ListItem
                    key={transaction.id}
                    title={transaction.type === 'transfer' ? 'Transfer' : (categoryMap.get(transaction.categoryId || '')?.name || 'Uncategorized')}
                    subtitle={`${getTransactionSubtitle(transaction)}${transaction.notes ? ` • ${transaction.notes}` : ''}`}
                    value={
                      <span
                        style={{
                          color:
                            transaction.type === 'income'
                              ? theme.colors.success
                              : transaction.type === 'expense'
                              ? theme.colors.danger
                              : theme.colors.textPrimary,
                        }}
                      >
                        {formatTransactionValue(transaction)}
                      </span>
                    }
                    badgeLabel={
                      transaction.type === 'transfer'
                        ? 'Transfer'
                        : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
                    }
                    badgeTone={getBadgeTone(transaction.type)}
                    showDivider={txIndex !== group.transactions.length - 1}
                    actions={
                      <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => handleDelete(transaction)}>
                          Delete
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={derived.activeFilterCount > 0 ? 'No transactions found' : `No transactions for ${derived.labels.month}`}
            description={
              derived.activeFilterCount > 0
                ? 'Try adjusting your filters or clear them to see all transactions.'
                : 'Add a transaction or navigate to a different month.'
            }
            action={
              derived.activeFilterCount > 0 ? (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" onClick={() => navigate('/transactions/add')}>
                  Add transaction
                </Button>
              )
            }
          />
        )}
      </Card>
    </div>
  );
}
