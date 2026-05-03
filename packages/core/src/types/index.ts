export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'credit';

export type CategoryType = 'income' | 'expense';

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
}

export interface FilterParams {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  dateRange?: DateRange;
}

// F-004: Dashboard types
export interface CategoryAggregation {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  total: number;
  count: number;
  percentage?: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export type PeriodMode = 'monthly' | 'yearly' | 'custom';

export interface DashboardFilter {
  type?: 'income' | 'expense';
  periodMode: PeriodMode;
  month?: number;
  year: number;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
}
