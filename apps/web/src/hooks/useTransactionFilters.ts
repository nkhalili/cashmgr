/**
 * useTransactionFilters Hook (Web)
 *
 * Consolidates filter state management using useReducer pattern with React Router URL sync.
 * Replaces multiple separate useState hooks with single state object.
 *
 * Features:
 * - Typed reducer actions for all filter operations
 * - Derived state (active filter count, display labels)
 * - URL synchronization with React Router
 * - Debounced search query
 * - Month navigation using filter-utils
 */

import { useEffect, useMemo, useReducer, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TransactionType } from '@cashmgr/core';
import { navigateMonth, getMonthLabel } from '@cashmgr/core';
import { useDebounce } from './useDebounce';

/**
 * Filter state shape
 * Uses 1-12 month indexing (consistent with filter-utils)
 */
export interface FilterState {
  type: TransactionType | '';
  accountId: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  searchQuery: string;
  currentMonth: number; // 1-12 indexing
  currentYear: number;
}

/**
 * Discriminated union of all possible filter actions
 */
export type FilterAction =
  | { type: 'SET_TYPE'; payload: TransactionType | '' }
  | { type: 'SET_ACCOUNT'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_DATE_RANGE'; payload: { startDate: string; endDate: string } }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'NAVIGATE_MONTH'; payload: 'prev' | 'next' }
  | { type: 'CLEAR_ALL' }
  | { type: 'INIT_FROM_URL'; payload: Partial<FilterState> };

/**
 * Derived state computed from filter state
 */
export interface DerivedFilterState {
  activeFilterCount: number;
  labels: {
    type: string;
    account: string;
    category: string;
    dateRange: string;
    month: string;
  };
}

/**
 * Get initial filter state from URL search params
 */
function getInitialStateFromUrl(searchParams: URLSearchParams): FilterState {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // Convert to 1-12
  const currentYear = now.getFullYear();

  return {
    type: (searchParams.get('type') as TransactionType) || '',
    accountId: searchParams.get('accountId') || '',
    categoryId: searchParams.get('categoryId') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    searchQuery: searchParams.get('search') || '',
    currentMonth: parseInt(searchParams.get('month') || String(currentMonth), 10) || currentMonth,
    currentYear: parseInt(searchParams.get('year') || String(currentYear), 10) || currentYear,
  };
}

/**
 * Sync filter state to URL search params
 */
function syncStateToUrl(state: FilterState, setSearchParams: ReturnType<typeof useSearchParams>[1]): void {
  const params: Record<string, string> = {};

  if (state.type) params.type = state.type;
  if (state.accountId) params.accountId = state.accountId;
  if (state.categoryId) params.categoryId = state.categoryId;
  if (state.startDate) params.startDate = state.startDate;
  if (state.endDate) params.endDate = state.endDate;
  if (state.searchQuery) params.search = state.searchQuery;

  // Only add month/year if they differ from current date
  const now = new Date();
  if (state.currentMonth !== now.getMonth() + 1 || state.currentYear !== now.getFullYear()) {
    params.month = String(state.currentMonth);
    params.year = String(state.currentYear);
  }

  setSearchParams(params, { replace: true });
}

/**
 * Filter reducer
 */
function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_TYPE':
      return { ...state, type: action.payload };

    case 'SET_ACCOUNT':
      return { ...state, accountId: action.payload };

    case 'SET_CATEGORY':
      return { ...state, categoryId: action.payload };

    case 'SET_DATE_RANGE':
      return {
        ...state,
        startDate: action.payload.startDate,
        endDate: action.payload.endDate,
      };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };

    case 'NAVIGATE_MONTH': {
      const result = navigateMonth(state.currentYear, state.currentMonth, action.payload);
      return {
        ...state,
        currentMonth: result.month,
        currentYear: result.year,
        // Clear custom date range when navigating months
        startDate: '',
        endDate: '',
      };
    }

    case 'CLEAR_ALL': {
      const now = new Date();
      return {
        type: '',
        accountId: '',
        categoryId: '',
        startDate: '',
        endDate: '',
        searchQuery: '',
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear(),
      };
    }

    case 'INIT_FROM_URL':
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}

/**
 * Compute derived filter state
 */
function computeDerivedState(
  state: FilterState,
  accounts: Array<{ id: string; name: string }>,
  categories: Array<{ id: string; name: string; icon?: string }>
): DerivedFilterState {
  // Count active filters (excluding search and month navigation)
  let count = 0;
  if (state.type) count++;
  if (state.accountId) count++;
  if (state.categoryId) count++;
  if (state.startDate && state.endDate) count++;

  // Type label
  const typeLabel =
    state.type === 'income'
      ? 'Income'
      : state.type === 'expense'
      ? 'Expense'
      : state.type === 'transfer'
      ? 'Transfer'
      : 'Type';

  // Account label
  const account = accounts.find((a) => a.id === state.accountId);
  const accountLabel = account ? account.name : 'Account';

  // Category label
  const category = categories.find((c) => c.id === state.categoryId);
  const categoryLabel = category
    ? `${category.icon ? `${category.icon} ` : ''}${category.name}`
    : 'Category';

  // Date range label
  let dateRangeLabel = 'Date';
  if (state.startDate && state.endDate) {
    dateRangeLabel = `${state.startDate} - ${state.endDate}`;
  } else if (state.startDate) {
    dateRangeLabel = `From ${state.startDate}`;
  } else if (state.endDate) {
    dateRangeLabel = `Until ${state.endDate}`;
  }

  // Month label
  const monthLabel = getMonthLabel(state.currentMonth, state.currentYear, 'long');

  return {
    activeFilterCount: count,
    labels: {
      type: typeLabel,
      account: accountLabel,
      category: categoryLabel,
      dateRange: dateRangeLabel,
      month: monthLabel,
    },
  };
}

/**
 * useTransactionFilters Hook
 *
 * @param accounts - List of accounts for label computation
 * @param categories - List of categories for label computation
 * @returns Filter state, dispatch, derived state, and URL-synced filter management
 */
export function useTransactionFilters(
  accounts: Array<{ id: string; name: string }> = [],
  categories: Array<{ id: string; name: string; icon?: string }> = []
) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL on mount
  const [state, dispatch] = useReducer(
    filterReducer,
    searchParams,
    getInitialStateFromUrl
  );

  // Sync state to URL whenever it changes
  useEffect(() => {
    syncStateToUrl(state, setSearchParams);
  }, [state, setSearchParams]);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // Compute derived state
  const derived = useMemo(
    () => computeDerivedState(state, accounts, categories),
    [state, accounts, categories]
  );

  // Reload trigger
  const reload = useCallback(() => {
    // Trigger reload by dispatching a no-op action
    // In web, we rely on useEffect dependencies for data loading
    // This is mainly for compatibility with mobile API
  }, []);

  return {
    state,
    dispatch,
    derived,
    debouncedSearchQuery,
    reload,
  };
}
