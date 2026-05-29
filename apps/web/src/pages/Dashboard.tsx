import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Badge,
  Button,
  Card,
  DateInput,
  EmptyState,
  useTheme,
  getCategoryColor,
} from '@cashmgr/ui';
import type { CategoryAggregation, DashboardSummary, DashboardFilter, PeriodMode, BudgetWithProgress } from '@cashmgr/core';
import { useDashboardService, useBudgetsService } from '../services/services-context';
import { formatCurrency, ErrorHandler, navigateMonth as navigateMonthUtil, getMonthLabel } from '@cashmgr/core';
import type { TotalBalanceResult } from '../services/dashboard-service';
import { renderCustomLabel, type LabelPosition } from '../utils/pie-chart-labels';
import { MonthNavigator } from '../components/MonthNavigator';

export function Dashboard() {
  const theme = useTheme();
  const dashboardService = useDashboardService();
  const budgetsService = useBudgetsService();

  // Current date for defaults
  const now = new Date();

  // Filter state
  const [transactionType, setTransactionType] = React.useState<'income' | 'expense'>('expense');
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('monthly');
  const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth());
  const [selectedYear, setSelectedYear] = React.useState(now.getFullYear());
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');

  // Data state
  const [categoryBreakdown, setCategoryBreakdown] = React.useState<CategoryAggregation[]>([]);
  const [summary, setSummary] = React.useState<DashboardSummary>({ totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  const [totalBalance, setTotalBalance] = React.useState<TotalBalanceResult | null>(null);
  const [budgetMap, setBudgetMap] = React.useState<Map<string, BudgetWithProgress>>(new Map());
  const [loading, setLoading] = React.useState(true);

  // Build filter object
  const buildFilter = React.useCallback((): DashboardFilter => {
    const filter: DashboardFilter = {
      type: transactionType,
      periodMode,
      year: selectedYear,
    };

    if (periodMode === 'monthly') {
      filter.month = selectedMonth;
    } else if (periodMode === 'custom' && customStartDate && customEndDate) {
      // B-001: Use date strings directly (YYYY-MM-DD format)
      filter.startDate = customStartDate;
      filter.endDate = customEndDate;
    }

    return filter;
  }, [transactionType, periodMode, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Year navigation
  const navigateYear = (direction: 'prev' | 'next') => {
    setSelectedYear(y => direction === 'prev' ? y - 1 : y + 1);
  };

  // Month navigation for monthly mode - uses filter-utils
  const handleMonthNavigation = React.useCallback((direction: 'prev' | 'next') => {
    // Convert from 0-11 to 1-12 for filter-utils
    const result = navigateMonthUtil(selectedYear, selectedMonth + 1, direction);
    setSelectedMonth(result.month - 1); // Convert back to 0-11
    setSelectedYear(result.year);
  }, [selectedMonth, selectedYear]);

  // Load data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const filter = buildFilter();
      const [breakdown, summaryData, balanceData] = await Promise.all([
        dashboardService.getCategoryBreakdown(filter),
        dashboardService.getSummary(filter),
        dashboardService.getTotalBalance(filter),
      ]);
      setCategoryBreakdown(breakdown);
      setSummary(summaryData);
      setTotalBalance(balanceData);

      if (periodMode === 'monthly' && transactionType === 'expense') {
        const budgets = await budgetsService.getBudgetsWithProgress(selectedMonth + 1, selectedYear);
        setBudgetMap(new Map(budgets.map((b) => [b.categoryId, b])));
      } else {
        setBudgetMap(new Map());
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Dashboard.loadData');
    } finally {
      setLoading(false);
    }
  }, [dashboardService, budgetsService, buildFilter, periodMode, transactionType, selectedMonth, selectedYear]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Chart data - always use vibrant chart colors for consistent appearance
  const chartData = categoryBreakdown.map((cat, index) => ({
    name: cat.categoryName,
    value: cat.total,
    percentage: cat.percentage,
    color: getCategoryColor(index, transactionType),
    icon: cat.categoryIcon,
  }));

  // Store label positions for collision detection (reset on each render)
  const labelPositionsRef = React.useRef<LabelPosition[]>([]);
  labelPositionsRef.current = [];

  const total = categoryBreakdown.reduce((sum, cat) => sum + cat.total, 0);

  // Period label for display - uses getMonthLabel from filter-utils
  const getPeriodLabel = () => {
    if (periodMode === 'monthly') {
      return getMonthLabel(selectedMonth + 1, selectedYear, 'long'); // Convert 0-11 to 1-12
    }
    if (periodMode === 'yearly') {
      return `${selectedYear}`;
    }
    if (customStartDate && customEndDate) {
      return `${customStartDate} to ${customEndDate}`;
    }
    return 'Custom Period';
  };

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.lg,
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: theme.typography.h1.fontSize,
            fontWeight: theme.typography.h1.fontWeight,
          }}
        >
          Dashboard
        </h2>
        <p style={{ marginTop: theme.spacing.xs, color: theme.colors.textSecondary }}>
          Financial overview for {getPeriodLabel()}
        </p>
      </div>

      {/* Summary Cards - Compact (including F-030 Net Balance when conversion needed) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: totalBalance?.isConverted ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
          gap: theme.spacing.sm,
        }}
      >
        <Card title="Income" subtitle={getPeriodLabel()} tone="success" withSurfaceGradient>
          <p
            style={{
              margin: 0,
              fontSize: theme.typography.h4.fontSize,
              fontWeight: theme.typography.numeric.fontWeight,
              fontFeatureSettings: '"tnum" 1, "lnum" 1',
              color: theme.colors.success,
            }}
          >
            {formatCurrency(summary.totalIncome)}
          </p>
        </Card>
        <Card title="Expenses" subtitle={getPeriodLabel()} tone="danger" withSurfaceGradient>
          <p
            style={{
              margin: 0,
              fontSize: theme.typography.h4.fontSize,
              fontWeight: theme.typography.numeric.fontWeight,
              fontFeatureSettings: '"tnum" 1, "lnum" 1',
              color: theme.colors.danger,
            }}
          >
            {formatCurrency(summary.totalExpenses)}
          </p>
        </Card>
        <Card title="Net" subtitle={getPeriodLabel()} tone="default" withSurfaceGradient>
          <p
            style={{
              margin: 0,
              fontSize: theme.typography.h4.fontSize,
              fontWeight: theme.typography.numeric.fontWeight,
              fontFeatureSettings: '"tnum" 1, "lnum" 1',
              color: summary.netBalance >= 0 ? theme.colors.success : theme.colors.danger,
            }}
          >
            {formatCurrency(summary.netBalance)}
          </p>
        </Card>
        {/* F-030: Net Balance in primary currency - only show when conversion is needed */}
        {totalBalance && totalBalance.isConverted && (
          <Card
            title={`Net (${totalBalance.primaryCurrency?.id || 'USD'})`}
            subtitle={totalBalance.isConverted ? 'Converted' : getPeriodLabel()}
            tone="default"
            withSurfaceGradient
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
              <p
                style={{
                  margin: 0,
                  fontSize: theme.typography.h4.fontSize,
                  fontWeight: theme.typography.numeric.fontWeight,
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                  color: totalBalance.totalBalance >= 0 ? theme.colors.success : theme.colors.danger,
                }}
              >
                {totalBalance.isConverted && '≈ '}
                {totalBalance.formattedBalance}
              </p>
              <span
                className="info-tooltip"
                style={{
                  cursor: 'help',
                  fontSize: theme.typography.caption.fontSize,
                  color: theme.colors.textSecondary,
                  position: 'relative',
                }}
              >
                ⓘ
                <style>
                  {`
                    .info-tooltip::after {
                      content: 'Net balance with all amounts converted to your primary currency';
                      position: absolute;
                      bottom: 100%;
                      left: 50%;
                      transform: translateX(-50%);
                      background: ${theme.colors.surface};
                      border: 1px solid ${theme.colors.border};
                      color: ${theme.colors.textPrimary};
                      padding: 8px 12px;
                      border-radius: 6px;
                      font-size: 12px;
                      white-space: nowrap;
                      opacity: 0;
                      visibility: hidden;
                      transition: opacity 0.2s, visibility 0.2s;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                      z-index: 1000;
                      margin-bottom: 4px;
                    }
                    .info-tooltip:hover::after {
                      opacity: 1;
                      visibility: visible;
                    }
                  `}
                </style>
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card title="Filters" tone="default">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md, alignItems: 'flex-end' }}>
          {/* Type Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: theme.colors.textSecondary, fontSize: theme.typography.caption.fontSize }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: theme.spacing.xs }}>
              <Button
                variant={transactionType === 'expense' ? 'primary' : 'secondary'}
                onClick={() => setTransactionType('expense')}
              >
                Expense
              </Button>
              <Button
                variant={transactionType === 'income' ? 'primary' : 'secondary'}
                onClick={() => setTransactionType('income')}
              >
                Income
              </Button>
            </div>
          </div>

          {/* Period Mode */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: theme.colors.textSecondary, fontSize: theme.typography.caption.fontSize }}>
              Period
            </label>
            <div style={{ display: 'flex', gap: theme.spacing.xs }}>
              <Button
                variant={periodMode === 'monthly' ? 'primary' : 'secondary'}
                onClick={() => setPeriodMode('monthly')}
              >
                Monthly
              </Button>
              <Button
                variant={periodMode === 'yearly' ? 'primary' : 'secondary'}
                onClick={() => setPeriodMode('yearly')}
              >
                Yearly
              </Button>
              <Button
                variant={periodMode === 'custom' ? 'primary' : 'secondary'}
                onClick={() => setPeriodMode('custom')}
              >
                Custom
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          {periodMode === 'custom' && (
            <>
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
            </>
          )}
        </div>
      </Card>

      {/* Month Navigator - for monthly mode */}
      {periodMode === 'monthly' && (
        <MonthNavigator
          monthLabel={getMonthLabel(selectedMonth + 1, selectedYear, 'long')}
          onPrevMonth={() => handleMonthNavigation('prev')}
          onNextMonth={() => handleMonthNavigation('next')}
        />
      )}

      {/* Year Navigator - for yearly mode */}
      {periodMode === 'yearly' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.components.interactiveRadius,
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          }}
        >
          <button
            type="button"
            onClick={() => navigateYear('prev')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: theme.colors.background,
              cursor: 'pointer',
              color: theme.colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ‹
          </button>
          <span
            style={{
              fontWeight: 600,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textPrimary,
            }}
          >
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => navigateYear('next')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: theme.colors.background,
              cursor: 'pointer',
              color: theme.colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ›
          </button>
        </div>
      )}

      {/* Chart and Category Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: theme.spacing.md,
        }}
      >
        {/* Pie Chart */}
        <Card
          title={`${transactionType === 'income' ? 'Income' : 'Expense'} by Category`}
          subtitle={getPeriodLabel()}
          tone="default"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              Loading...
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState
              title={`No ${transactionType} transactions`}
              description={`No ${transactionType} transactions found for this period.`}
            />
          ) : (
            <div style={{ width: '100%', height: 320, overflow: 'visible' }}>
              <ResponsiveContainer>
                <PieChart margin={{ top: 20, right: 120, bottom: 20, left: 120 }}>
                  <defs>
                    <filter id="slice-shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                    </filter>
                  </defs>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={(props) => renderCustomLabel({ ...props, allLabels: labelPositionsRef.current, totalLabels: chartData.length })}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="pie-slice"
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <style>
                    {`
                      .pie-slice {
                        transition: transform 0.2s ease, filter 0.2s ease;
                        transform-origin: center;
                      }
                      .pie-slice:hover {
                        filter: url(#slice-shadow) brightness(1.1);
                        transform: scale(1.03);
                      }
                    `}
                  </style>
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name]}
                    contentStyle={{
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.md,
                      color: theme.colors.textPrimary,
                    }}
                    labelStyle={{ color: theme.colors.textPrimary }}
                    itemStyle={{ color: theme.colors.textPrimary }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
            <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.caption.fontSize }}>
              Total: {formatCurrency(total)}
            </span>
          </div>
        </Card>

        {/* Category Breakdown List */}
        <Card
          title="Category Breakdown"
          subtitle={`${categoryBreakdown.length} categories`}
          tone="default"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textSecondary }}>
              Loading...
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <EmptyState
              title="No categories"
              description="Add some transactions to see category breakdown."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              {categoryBreakdown.map((category, index) => (
                <div
                  key={category.categoryId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: theme.spacing.sm,
                    borderRadius: theme.radii.sm,
                    backgroundColor: theme.colors.surfaceMuted,
                  }}
                >
                  {/* Category Icon with Color Background */}
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: getCategoryColor(index, transactionType),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {category.categoryIcon || ''}
                  </span>
                  {/* Name + budget badge stacked vertically */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ color: theme.colors.textPrimary }}>
                      {category.categoryName}
                    </span>
                    {periodMode === 'monthly' && transactionType === 'expense' && (() => {
                      const budget = budgetMap.get(category.categoryId);
                      if (!budget) return null;
                      return budget.spent > budget.amount
                        ? <Badge label="Over budget" tone="danger" style={{ fontSize: 9, padding: '1px 5px', alignSelf: 'flex-start' }} />
                        : <Badge label="On budget" tone="success" style={{ fontSize: 9, padding: '1px 5px', alignSelf: 'flex-start' }} />;
                    })()}
                  </div>
                  {/* Amount */}
                  <span
                    style={{
                      fontWeight: theme.typography.numeric.fontWeight,
                      fontFeatureSettings: '"tnum" 1, "lnum" 1',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {formatCurrency(category.total)}
                  </span>
                  {/* Percentage Badge */}
                  <Badge label={`${category.percentage}%`} tone="neutral" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
