import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Theme, useTheme, getCategoryColor } from '@cashmgr/ui';
import type {
  CategoryAggregation,
  DashboardSummary,
  DashboardFilter,
  PeriodMode,
  BudgetWithProgress,
} from '@cashmgr/core';
import { ErrorHandler, navigateMonth as utilNavigateMonth, getMonthLabel } from '@cashmgr/core';
import { useDashboardService, useBudgetsService } from '../../src/contexts/services-context';
import type { TotalBalanceResult } from '../../src/services/dashboard-service';
import { DateInput } from '../../src/components/DateInput';
import { PieChart } from '../../src/components/PieChart';
import { SummaryCard, type SummaryItem } from '../../src/components/SummaryCard';
import { MonthNavigator } from '../../src/components/MonthNavigator';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function HomeScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const statusStyle = theme.mode === 'dark' ? 'light' : 'dark';
  const dashboardService = useDashboardService();
  const budgetsService = useBudgetsService();

  const now = new Date();
  const [filter, setFilter] = React.useState<DashboardFilter>({
    type: 'expense',
    periodMode: 'monthly',
    month: now.getMonth() + 1, // Use 1-12 indexing
    year: now.getFullYear(),
  });

  // B-002: Custom date range state
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');

  const [breakdown, setBreakdown] = React.useState<CategoryAggregation[]>([]);
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [totalBalance, setTotalBalance] = React.useState<TotalBalanceResult | null>(null);
  const [budgetMap, setBudgetMap] = React.useState<Map<string, BudgetWithProgress>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedSliceId, setSelectedSliceId] = React.useState<string | null>(null);

  // B-002: Build filter with custom dates when in custom mode
  const buildFilter = React.useCallback((): DashboardFilter => {
    const result: DashboardFilter = { ...filter };
    // Convert 1-12 month to 0-11 for API if needed, or update API to use 1-12
    // For now, keeping month as is since DashboardFilter expects it
    if (filter.periodMode === 'custom' && customStartDate && customEndDate) {
      result.startDate = customStartDate;
      result.endDate = customEndDate;
    }
    return result;
  }, [filter, customStartDate, customEndDate]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const currentFilter = buildFilter();
      const [breakdownData, summaryData, balanceData] = await Promise.all([
        dashboardService.getCategoryBreakdown(currentFilter),
        dashboardService.getSummary(currentFilter),
        dashboardService.getTotalBalance(currentFilter),
      ]);
      setBreakdown(breakdownData);
      setSummary(summaryData);
      setTotalBalance(balanceData);

      if (currentFilter.periodMode === 'monthly' && currentFilter.type === 'expense') {
        const budgets = await budgetsService.getBudgetsWithProgress(currentFilter.month ?? 1, currentFilter.year);
        setBudgetMap(new Map(budgets.map((b) => [b.categoryId, b])));
      } else {
        setBudgetMap(new Map());
      }
    } catch (error) {
      // Silent fail on refresh
    } finally {
      setIsRefreshing(false);
    }
  }, [dashboardService, budgetsService, buildFilter]);

  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        // Run sequentially to avoid expo-sqlite race conditions
        const currentFilter = buildFilter();
        const breakdownData = await dashboardService.getCategoryBreakdown(currentFilter);
        const summaryData = await dashboardService.getSummary(currentFilter);
        const balanceData = await dashboardService.getTotalBalance(currentFilter);
        let newBudgetMap = new Map<string, BudgetWithProgress>();
        if (currentFilter.periodMode === 'monthly' && currentFilter.type === 'expense') {
          const budgets = await budgetsService.getBudgetsWithProgress(currentFilter.month ?? 1, currentFilter.year);
          newBudgetMap = new Map(budgets.map((b) => [b.categoryId, b]));
        }
        if (isMounted) {
          setBreakdown(breakdownData);
          setSummary(summaryData);
          setTotalBalance(balanceData);
          setBudgetMap(newBudgetMap);
        }
      } catch (error) {
        ErrorHandler.handle(error, 'Dashboard.loadData');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [dashboardService, budgetsService, buildFilter]);

  const setType = (type: 'income' | 'expense') => {
    setFilter((prev) => ({ ...prev, type }));
  };

  const setPeriodMode = (periodMode: PeriodMode) => {
    setFilter((prev) => ({ ...prev, periodMode }));
  };

  // B-002: Year navigation
  const navigateYear = (direction: 'prev' | 'next') => {
    setFilter((prev) => ({
      ...prev,
      year: prev.year + (direction === 'prev' ? -1 : 1),
    }));
  };

  // Month navigation for monthly mode - uses filter-utils
  const handleMonthNavigate = React.useCallback((direction: 'prev' | 'next') => {
    setFilter((prev) => {
      const currentMonth = prev.month ?? 1;
      const currentYear = prev.year;
      const result = utilNavigateMonth(currentYear, currentMonth, direction);
      return { ...prev, month: result.month, year: result.year };
    });
  }, []);

  // B-002: Period label for display
  const getPeriodLabel = () => {
    if (filter.periodMode === 'monthly') {
      return getMonthLabel(filter.month ?? 1, filter.year, 'long');
    }
    if (filter.periodMode === 'yearly') {
      return `${filter.year}`;
    }
    if (customStartDate && customEndDate) {
      return `${customStartDate} to ${customEndDate}`;
    }
    return 'Custom Period';
  };

  // Build summary items for SummaryCard
  const summaryItems: SummaryItem[] = React.useMemo(() => {
    return [
      {
        label: 'Income',
        value: summary?.totalIncome ?? 0,
        type: 'income' as const,
      },
      {
        label: 'Expenses',
        value: summary?.totalExpenses ?? 0,
        type: 'expense' as const,
      },
      {
        label: 'Net',
        value: summary?.netBalance ?? 0,
        type: 'net' as const,
      },
    ];
  }, [summary]);

  // Convert breakdown data to PieChart format
  // Use consistent chart colors from @cashmgr/ui (same as web/desktop)
  const pieChartData = React.useMemo(() => {
    return breakdown.map((item, index) => ({
      id: item.categoryId,
      label: item.categoryName,
      value: item.total,
      color: getCategoryColor(index, filter.type),
    }));
  }, [breakdown, filter.type]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <StatusBar style={statusStyle} />

      {/* F-030: Net Balance Card - only show when conversion is needed */}
      {totalBalance && totalBalance.isConverted && (
        <View style={styles.netBalanceCard}>
          <View style={styles.netBalanceHeader}>
            <Text style={styles.netBalanceLabel}>
              Net ({totalBalance.primaryCurrency?.id || 'USD'})
            </Text>
            <Text style={styles.netBalanceSubtitle}>
              {totalBalance.isConverted ? 'Converted to primary currency' : getPeriodLabel()}
            </Text>
          </View>
          <Text
            style={[
              styles.netBalanceAmount,
              { color: totalBalance.totalBalance >= 0 ? theme.colors.success : theme.colors.danger },
            ]}
          >
            {totalBalance.isConverted && '≈ '}
            {totalBalance.formattedBalance}
          </Text>
        </View>
      )}

      {/* Summary Cards - Using SummaryCard component */}
      <SummaryCard items={summaryItems} currency="USD" style={styles.summaryCard} />

      {/* Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, filter.type === 'expense' && styles.toggleActive]}
          onPress={() => setType('expense')}
        >
          <Text
            style={[styles.toggleText, filter.type === 'expense' && styles.toggleTextActive]}
          >
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, filter.type === 'income' && styles.toggleActive]}
          onPress={() => setType('income')}
        >
          <Text style={[styles.toggleText, filter.type === 'income' && styles.toggleTextActive]}>
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* Period Mode Toggle */}
      <View style={styles.periodContainer}>
        {(['monthly', 'yearly', 'custom'] as PeriodMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.periodButton, filter.periodMode === mode && styles.periodActive]}
            onPress={() => setPeriodMode(mode)}
          >
            <Text
              style={[
                styles.periodText,
                filter.periodMode === mode && styles.periodTextActive,
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Month Navigator (for monthly mode) - Using MonthNavigator component */}
      {filter.periodMode === 'monthly' && (
        <MonthNavigator
          month={filter.month ?? 1}
          year={filter.year}
          onNavigate={handleMonthNavigate}
          style={styles.monthNavigator}
        />
      )}

      {/* B-002: Year navigation (only for yearly mode) */}
      {filter.periodMode === 'yearly' && (
        <View style={styles.yearNavContainer}>
          <TouchableOpacity
            style={styles.yearNavButton}
            onPress={() => navigateYear('prev')}
          >
            <Text style={styles.yearNavButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.yearNavLabel}>{filter.year}</Text>
          <TouchableOpacity
            style={styles.yearNavButton}
            onPress={() => navigateYear('next')}
          >
            <Text style={styles.yearNavButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* B-002: Custom date range inputs */}
      {filter.periodMode === 'custom' && (
        <View style={styles.customDateContainer}>
          <DateInput
            label="From Date"
            value={customStartDate}
            onChange={setCustomStartDate}
          />
          <DateInput
            label="To Date"
            value={customEndDate}
            onChange={setCustomEndDate}
          />
        </View>
      )}

      {/* Pie Chart - Using extracted PieChart component */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          {filter.type === 'expense' ? 'Expense' : 'Income'} Breakdown
        </Text>
        <Text style={styles.chartSubtitle}>{getPeriodLabel()}</Text>
        {loading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : breakdown.length === 0 ? (
          <View style={styles.chartEmpty}>
            <Text style={styles.emptyText}>No transactions for this period</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={1}
            style={styles.chartContainer}
            onPress={() => setSelectedSliceId(null)}
          >
            <PieChart
              data={pieChartData}
              size={200}
              innerRadius={0}
              selectedId={selectedSliceId}
              onSelectSlice={setSelectedSliceId}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Category List */}
      <View style={styles.categoriesCard}>
        <Text style={styles.categoriesTitle}>Categories</Text>
        {breakdown.map((item, index) => {
          const percentage = item.percentage?.toFixed(1) || '0.0';
          const categoryColor = getCategoryColor(index, filter.type);
          return (
            <TouchableOpacity
              key={item.categoryId}
              style={[
                styles.categoryItem,
                selectedSliceId === item.categoryId && styles.categoryItemSelected,
              ]}
              onPress={() => setSelectedSliceId(item.categoryId)}
            >
              <View style={styles.categoryLeft}>
                {/* Color-coded circle with icon (matches web/desktop) */}
                <View
                  style={[
                    styles.categoryColorBadge,
                    { backgroundColor: categoryColor },
                  ]}
                >
                  <Text style={styles.categoryIcon}>{item.categoryIcon || '📁'}</Text>
                </View>
                {/* Name + budget badge stacked vertically */}
                <View style={styles.categoryNameColumn}>
                  <Text style={styles.categoryName}>{item.categoryName}</Text>
                  {filter.periodMode === 'monthly' && filter.type === 'expense' && (() => {
                    const budget = budgetMap.get(item.categoryId);
                    if (!budget) return null;
                    const isOver = budget.spent > budget.amount;
                    return (
                      <View style={[styles.budgetBadge, isOver ? styles.budgetBadgeOver : styles.budgetBadgeOn]}>
                        <Text style={[styles.budgetBadgeText, isOver ? styles.budgetBadgeTextOver : styles.budgetBadgeTextOn]}>
                          {isOver ? 'Over budget' : 'On budget'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>{formatCurrency(item.total)}</Text>
                <Text style={styles.categoryPercent}>{percentage}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
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
      paddingBottom: 32,
    },
    // Net Balance Card
    netBalanceCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    netBalanceHeader: {
      marginBottom: 8,
    },
    netBalanceLabel: {
      fontSize: 14,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    netBalanceSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    netBalanceAmount: {
      fontSize: 32,
      fontWeight: fontWeight(700),
    },
    // Summary Card
    summaryCard: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    // Type Toggle
    toggleContainer: {
      flexDirection: 'row',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    toggleActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    toggleText: {
      fontSize: 16,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    toggleTextActive: {
      color: '#fff',
    },
    // Period Mode Toggle
    periodContainer: {
      flexDirection: 'row',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    periodActive: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: theme.colors.primary,
    },
    periodText: {
      fontSize: 14,
      fontWeight: fontWeight(500),
      color: theme.colors.textSecondary,
    },
    periodTextActive: {
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
    // Month Navigator
    monthNavigator: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    // Year Navigation
    yearNavContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    yearNavButton: {
      padding: 4,
      borderRadius: 4,
    },
    yearNavButtonText: {
      fontSize: 18,
      color: theme.colors.textPrimary,
      fontWeight: fontWeight(500),
    },
    yearNavLabel: {
      fontSize: 16,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    // Custom Date Range
    customDateContainer: {
      marginHorizontal: 16,
      marginBottom: 16,
      gap: 12,
    },
    // Chart Card
    chartCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    chartSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    chartContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    chartLoading: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartEmpty: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    // Categories List
    categoriesCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoriesTitle: {
      fontSize: 18,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
      marginBottom: 16,
    },
    categoryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    categoryItemSelected: {
      backgroundColor: `${theme.colors.primary}10`,
    },
    categoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    categoryColorBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryIcon: {
      fontSize: 16,
    },
    categoryNameColumn: {
      flex: 1,
      flexDirection: 'column',
    },
    categoryName: {
      fontSize: 16,
      fontWeight: fontWeight(500),
      color: theme.colors.textPrimary,
    },
    categoryRight: {
      alignItems: 'flex-end',
    },
    categoryAmount: {
      fontSize: 16,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    categoryPercent: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    budgetBadge: {
      marginTop: 2,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    budgetBadgeOn: {
      backgroundColor: `${theme.colors.success}1a`,
    },
    budgetBadgeOver: {
      backgroundColor: `${theme.colors.danger}1a`,
    },
    budgetBadgeText: {
      fontSize: 9,
      fontWeight: fontWeight(600),
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    budgetBadgeTextOn: {
      color: theme.colors.success,
    },
    budgetBadgeTextOver: {
      color: theme.colors.danger,
    },
  });
