import { renderHook, act } from '@testing-library/react-native';
import { useTransactionFilters } from '../useTransactionFilters';
import type { Account, Category } from '@cashmgr/core';

describe('useTransactionFilters', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc1',
      name: 'Checking',
      type: 'bank',
      balance: 1000,
      currency: 'USD',
      initialBalance: 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'acc2',
      name: 'Savings',
      type: 'bank',
      balance: 5000,
      currency: 'USD',
      initialBalance: 5000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat1',
      name: 'Food',
      type: 'expense',
      icon: '🍔',
      parentId: undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat2',
      name: 'Salary',
      type: 'income',
      icon: '💰',
      parentId: undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.state.type).toBe('');
      expect(result.current.state.accountId).toBe('');
      expect(result.current.state.categoryId).toBe('');
      expect(result.current.state.startDate).toBe('');
      expect(result.current.state.endDate).toBe('');
      expect(result.current.state.searchQuery).toBe('');
      expect(result.current.state.currentMonth).toBeGreaterThan(0);
      expect(result.current.state.currentMonth).toBeLessThanOrEqual(12);
    });

    it('should initialize with account ID from params', () => {
      const { result } = renderHook(() =>
        useTransactionFilters('acc1', mockAccounts, mockCategories)
      );

      expect(result.current.state.accountId).toBe('acc1');
    });
  });

  describe('filter actions', () => {
    it('should set transaction type', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      act(() => {
        result.current.dispatch({ type: 'SET_TYPE', payload: 'expense' });
      });

      expect(result.current.state.type).toBe('expense');
    });

    it('should set account filter', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      act(() => {
        result.current.dispatch({ type: 'SET_ACCOUNT', payload: 'acc1' });
      });

      expect(result.current.state.accountId).toBe('acc1');
    });

    it('should set category filter', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      act(() => {
        result.current.dispatch({ type: 'SET_CATEGORY', payload: 'cat1' });
      });

      expect(result.current.state.categoryId).toBe('cat1');
    });

    it('should set date range', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_DATE_RANGE',
          payload: { startDate: '2024-01-01', endDate: '2024-01-31' },
        });
      });

      expect(result.current.state.startDate).toBe('2024-01-01');
      expect(result.current.state.endDate).toBe('2024-01-31');
    });

    it('should set search query', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      act(() => {
        result.current.dispatch({ type: 'SET_SEARCH', payload: 'groceries' });
      });

      expect(result.current.state.searchQuery).toBe('groceries');
    });

    it('should clear all filters', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      // Set multiple filters
      act(() => {
        result.current.dispatch({ type: 'SET_TYPE', payload: 'expense' });
        result.current.dispatch({ type: 'SET_ACCOUNT', payload: 'acc1' });
        result.current.dispatch({ type: 'SET_CATEGORY', payload: 'cat1' });
        result.current.dispatch({ type: 'SET_SEARCH', payload: 'test' });
      });

      // Clear all
      act(() => {
        result.current.dispatch({ type: 'CLEAR_ALL' });
      });

      expect(result.current.state.type).toBe('');
      expect(result.current.state.accountId).toBe('');
      expect(result.current.state.categoryId).toBe('');
      expect(result.current.state.searchQuery).toBe('');
    });
  });

  describe('month navigation', () => {
    it('should navigate to next month', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      const initialMonth = result.current.state.currentMonth;
      const initialYear = result.current.state.currentYear;

      act(() => {
        result.current.dispatch({ type: 'NAVIGATE_MONTH', payload: 'next' });
      });

      if (initialMonth === 12) {
        expect(result.current.state.currentMonth).toBe(1);
        expect(result.current.state.currentYear).toBe(initialYear + 1);
      } else {
        expect(result.current.state.currentMonth).toBe(initialMonth + 1);
        expect(result.current.state.currentYear).toBe(initialYear);
      }
    });

    it('should navigate to previous month', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      const initialMonth = result.current.state.currentMonth;
      const initialYear = result.current.state.currentYear;

      act(() => {
        result.current.dispatch({ type: 'NAVIGATE_MONTH', payload: 'prev' });
      });

      if (initialMonth === 1) {
        expect(result.current.state.currentMonth).toBe(12);
        expect(result.current.state.currentYear).toBe(initialYear - 1);
      } else {
        expect(result.current.state.currentMonth).toBe(initialMonth - 1);
        expect(result.current.state.currentYear).toBe(initialYear);
      }
    });

    it('should clear custom date range when navigating months', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_DATE_RANGE',
          payload: { startDate: '2024-01-01', endDate: '2024-01-31' },
        });
      });

      expect(result.current.state.startDate).toBe('2024-01-01');

      act(() => {
        result.current.dispatch({ type: 'NAVIGATE_MONTH', payload: 'next' });
      });

      expect(result.current.state.startDate).toBe('');
      expect(result.current.state.endDate).toBe('');
    });
  });

  describe('derived state', () => {
    it('should calculate active filter count', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      expect(result.current.derived.activeFilterCount).toBe(0);

      act(() => {
        result.current.dispatch({ type: 'SET_TYPE', payload: 'expense' });
      });

      expect(result.current.derived.activeFilterCount).toBe(1);

      act(() => {
        result.current.dispatch({ type: 'SET_ACCOUNT', payload: 'acc1' });
      });

      expect(result.current.derived.activeFilterCount).toBe(2);
    });

    it('should generate correct type label', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      expect(result.current.derived.labels.type).toBe('Type');

      act(() => {
        result.current.dispatch({ type: 'SET_TYPE', payload: 'expense' });
      });

      expect(result.current.derived.labels.type).toBe('Expense');

      act(() => {
        result.current.dispatch({ type: 'SET_TYPE', payload: 'income' });
      });

      expect(result.current.derived.labels.type).toBe('Income');
    });

    it('should generate correct account label', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      expect(result.current.derived.labels.account).toBe('Account');

      act(() => {
        result.current.dispatch({ type: 'SET_ACCOUNT', payload: 'acc1' });
      });

      expect(result.current.derived.labels.account).toBe('Checking');
    });

    it('should generate correct category label with icon', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      expect(result.current.derived.labels.category).toBe('Category');

      act(() => {
        result.current.dispatch({ type: 'SET_CATEGORY', payload: 'cat1' });
      });

      expect(result.current.derived.labels.category).toBe('🍔 Food');
    });

    it('should generate correct date range label', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      expect(result.current.derived.labels.dateRange).toBe('Date');

      act(() => {
        result.current.dispatch({
          type: 'SET_DATE_RANGE',
          payload: { startDate: '2024-01-01', endDate: '2024-01-31' },
        });
      });

      expect(result.current.derived.labels.dateRange).toBe('2024-01-01 - 2024-01-31');
    });

    it('should generate month label', () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      // Should be in format "Month YYYY" like "January 2024"
      expect(result.current.derived.labels.month).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    });
  });

  describe('debounced search query', () => {
    it('should return debounced search query', async () => {
      const { result } = renderHook(() =>
        useTransactionFilters(undefined, mockAccounts, mockCategories)
      );

      act(() => {
        result.current.dispatch({ type: 'SET_SEARCH', payload: 'test query' });
      });

      // Initially should be empty
      expect(result.current.debouncedSearchQuery).toBe('');

      // Wait for debounce (300ms)
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 350));

      expect(result.current.debouncedSearchQuery).toBe('test query');
    });
  });
});
