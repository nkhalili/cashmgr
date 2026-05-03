/**
 * useTransactionFilters Hook
 *
 * Consolidates filter state management using useReducer pattern.
 * Replaces 8 separate useState hooks with single state object.
 *
 * Features:
 * - Typed reducer actions for all filter operations
 * - Derived state (active filter count, display labels)
 * - Debounced search query
 * - Month navigation using filter-utils
 * - Explicit reload trigger
 */

import React from 'react';
import type { TransactionType } from '@cashmgr/core';
import { navigateMonth, getMonthLabel } from '@cashmgr/core';

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
  | { type: 'INIT_FROM_PARAMS'; payload: { accountId?: string } };

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
 * Get initial filter state
 */
function getInitialState(initialAccountId?: string): FilterState {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // Convert to 1-12
  const currentYear = now.getFullYear();

  return {
    type: '',
    accountId: initialAccountId || '',
    categoryId: '',
    startDate: '',
    endDate: '',
    searchQuery: '',
    currentMonth,
    currentYear,
  };
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
        ...getInitialState(),
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear(),
      };
    }

    case 'INIT_FROM_PARAMS':
      return {
        ...state,
        accountId: action.payload.accountId || '',
      };

    default:
      return state;
  }
}

/**
 * useDebounce hook
 * Debounces a value to prevent excessive updates
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
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
 * @param initialAccountId - Optional account ID to initialize filter (for deep linking)
 * @param accounts - List of accounts for label computation
 * @param categories - List of categories for label computation
 * @returns Filter state, dispatch, derived state, and reload trigger
 */
export function useTransactionFilters(
  initialAccountId?: string,
  accounts: Array<{ id: string; name: string }> = [],
  categories: Array<{ id: string; name: string; icon?: string }> = []
) {
  const [state, dispatch] = React.useReducer(
    filterReducer,
    initialAccountId,
    getInitialState
  );

  // Debounce search query
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // Compute derived state
  const derived = React.useMemo(
    () => computeDerivedState(state, accounts, categories),
    [state, accounts, categories]
  );

  // Reload trigger ref - allows explicit reload calls
  const [reloadCounter, setReloadCounter] = React.useState(0);
  const reload = React.useCallback(() => {
    setReloadCounter((prev) => prev + 1);
  }, []);

  // Initialize from params on mount
  React.useEffect(() => {
    if (initialAccountId) {
      dispatch({ type: 'INIT_FROM_PARAMS', payload: { accountId: initialAccountId } });
    }
  }, []); // Only run once on mount

  return {
    state,
    dispatch,
    derived,
    debouncedSearchQuery,
    reload,
    reloadCounter, // Can be used as dependency in effects
  };
}
