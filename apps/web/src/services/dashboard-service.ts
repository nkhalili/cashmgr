import type {
  DatabaseAdapter,
  CategoryAggregation,
  DashboardSummary,
  DashboardFilter,
  DateRange,
  FilterParams,
  Currency,
} from '@cashmgr/core';
import {
  ErrorHandler,
  getMonthStartDateString,
  getMonthEndDateString,
  getYearStartDateString,
  getYearEndDateString,
  getTodayDateString,
  convertToPrimary,
  getPrimaryCurrency,
  formatCurrencyWithSymbol,
  buildCategoryAggregationTree,
} from '@cashmgr/core';

/**
 * F-030: Total balance result with conversion indicator
 */
export interface TotalBalanceResult {
  totalBalance: number;
  primaryCurrency: Currency | null;
  isConverted: boolean;
  formattedBalance: string;
}

/**
 * F-004: DashboardService
 * Provides data for the dashboard including category breakdowns and summaries
 */
export class DashboardService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  /**
   * Get transactions aggregated by category with percentages.
   * Sub-category totals are rolled up into their parent category, and sub-category
   * percentages are relative to their parent's total (see CategoryAggregation.subcategories).
   */
  async getCategoryBreakdown(filter: DashboardFilter): Promise<CategoryAggregation[]> {
    try {
      const dateRange = this.getDateRange(filter);
      const filterParams: FilterParams = {
        type: filter.type,
        dateRange,
      };

      const [aggregations, categories] = await Promise.all([
        this.adapter.getTransactionAggregateByCategory(filterParams),
        this.adapter.getCategories(),
      ]);

      return buildCategoryAggregationTree(aggregations, categories);
    } catch (error) {
      throw ErrorHandler.handle(error, 'DashboardService.getCategoryBreakdown');
    }
  }

  /**
   * Get summary statistics for a date range
   */
  async getSummary(filter: DashboardFilter): Promise<DashboardSummary> {
    try {
      const dateRange = this.getDateRange(filter);

      // Get income aggregation
      const incomeAggregations = await this.adapter.getTransactionAggregateByCategory({
        type: 'income',
        dateRange,
      });
      const totalIncome = incomeAggregations.reduce((sum, agg) => sum + agg.total, 0);

      // Get expense aggregation
      const expenseAggregations = await this.adapter.getTransactionAggregateByCategory({
        type: 'expense',
        dateRange,
      });
      const totalExpenses = expenseAggregations.reduce((sum, agg) => sum + agg.total, 0);

      return {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
      };
    } catch (error) {
      throw ErrorHandler.handle(error, 'DashboardService.getSummary');
    }
  }

  /**
   * F-030: Get net balance (Income - Expenses) converted to primary currency
   * Returns net balance for the period with all amounts converted to primary currency
   * @param filter - Filter to specify the period for calculation
   */
  async getTotalBalance(filter?: DashboardFilter): Promise<TotalBalanceResult> {
    try {
      const dateRange = filter ? this.getDateRange(filter) : {
        startDate: getTodayDateString(),
        endDate: getTodayDateString(),
      };

      // Get currencies, accounts, and transactions for the period
      const [currencies, accounts, transactions] = await Promise.all([
        this.adapter.getCurrencies(false),
        this.adapter.getAccounts(),
        this.adapter.getTransactions({ dateRange }),
      ]);

      // Find primary currency
      const primaryCurrency = getPrimaryCurrency(currencies);

      if (!primaryCurrency) {
        return {
          totalBalance: 0,
          primaryCurrency: null,
          isConverted: false,
          formattedBalance: '$0.00',
        };
      }

      // Build currency map for lookups (account.currency -> Currency)
      const currencyMap = new Map(currencies.map((c) => [c.id, c]));

      // Build account map for lookups (account.id -> account.currency)
      const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]));

      // Track if any conversion is needed
      let isConverted = false;
      let totalIncome = 0;
      let totalExpenses = 0;

      // Calculate income and expenses with currency conversion
      for (const tx of transactions) {
        // Get the currency for this transaction's account
        const accountCurrencyId = accountCurrencyMap.get(tx.accountId);
        const accountCurrency = accountCurrencyId ? currencyMap.get(accountCurrencyId) : null;

        // Convert amount to primary currency
        let convertedAmount = tx.amount;
        if (accountCurrency) {
          if (!accountCurrency.isPrimary) {
            isConverted = true;
          }
          convertedAmount = convertToPrimary(tx.amount, accountCurrency);
        }

        if (tx.type === 'income') {
          totalIncome += convertedAmount;
        } else if (tx.type === 'expense') {
          totalExpenses += convertedAmount;
        }
        // Transfers don't affect net balance (money moves between accounts)
      }

      const totalBalance = totalIncome - totalExpenses;

      return {
        totalBalance,
        primaryCurrency,
        isConverted,
        formattedBalance: formatCurrencyWithSymbol(totalBalance, primaryCurrency),
      };
    } catch (error) {
      throw ErrorHandler.handle(error, 'DashboardService.getTotalBalance');
    }
  }

  /**
   * Convert DashboardFilter to DateRange based on period mode
   * B-001: Returns date strings in YYYY-MM-DD format
   */
  private getDateRange(filter: DashboardFilter): DateRange {
    if (filter.periodMode === 'monthly') {
      // month is 0-indexed from filter, but our helpers expect 1-indexed
      const month = (filter.month ?? new Date().getMonth()) + 1;
      const year = filter.year;
      return {
        startDate: getMonthStartDateString(year, month),
        endDate: getMonthEndDateString(year, month),
      };
    }

    if (filter.periodMode === 'yearly') {
      const year = filter.year;
      return {
        startDate: getYearStartDateString(year),
        endDate: getYearEndDateString(year),
      };
    }

    // Custom mode
    return {
      startDate: filter.startDate ?? getTodayDateString(),
      endDate: filter.endDate ?? getTodayDateString(),
    };
  }
}
