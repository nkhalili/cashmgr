import { renderHook } from '@testing-library/react-native';
import { useCategoryFormatter } from '../useCategoryFormatter';
import type { Category, Account } from '@cashmgr/core';

describe('useCategoryFormatter', () => {
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
      name: 'Groceries',
      type: 'expense',
      icon: '🛒',
      parentId: 'cat1',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat3',
      name: 'Transport',
      type: 'expense',
      icon: '🚗',
      parentId: undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat4',
      name: 'Salary',
      type: 'income',
      parentId: undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

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

  describe('flattenedCategories', () => {
    it('should return flattened categories with hierarchy', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      expect(result.current.flattenedCategories).toHaveLength(4);

      // Parent categories should come first, followed by their children
      const foodIndex = result.current.flattenedCategories.findIndex(
        (c) => c.id === 'cat1'
      );
      const groceriesIndex = result.current.flattenedCategories.findIndex(
        (c) => c.id === 'cat2'
      );

      expect(groceriesIndex).toBeGreaterThan(foodIndex);
    });

    it('should mark child categories correctly', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const groceries = result.current.flattenedCategories.find(
        (c) => c.id === 'cat2'
      );
      const food = result.current.flattenedCategories.find((c) => c.id === 'cat1');

      expect(groceries?.isChild).toBe(true);
      expect(food?.isChild).toBe(false);
    });

    it('should indent child category labels', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const groceries = result.current.flattenedCategories.find(
        (c) => c.id === 'cat2'
      );

      // Child categories should have 2-space indent
      expect(groceries?.label).toMatch(/^  /);
    });

    it('should include icons in labels', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const food = result.current.flattenedCategories.find((c) => c.id === 'cat1');

      expect(food?.label).toContain('🍔');
      expect(food?.label).toContain('Food');
    });

    it('should handle categories without icons', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const salary = result.current.flattenedCategories.find(
        (c) => c.id === 'cat4'
      );

      expect(salary?.label).toBe('Salary');
    });
  });

  describe('categoryMap', () => {
    it('should create a map of all categories by id', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      expect(result.current.categoryMap.size).toBe(4);
      expect(result.current.categoryMap.has('cat1')).toBe(true);
      expect(result.current.categoryMap.has('cat2')).toBe(true);
      expect(result.current.categoryMap.has('cat3')).toBe(true);
      expect(result.current.categoryMap.has('cat4')).toBe(true);
    });

    it('should provide O(1) category lookup', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const food = result.current.categoryMap.get('cat1');

      expect(food).toBeDefined();
      expect(food?.name).toBe('Food');
      expect(food?.icon).toBe('🍔');
    });
  });

  describe('accountMap', () => {
    it('should create a map of all accounts by id', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      expect(result.current.accountMap.size).toBe(2);
      expect(result.current.accountMap.has('acc1')).toBe(true);
      expect(result.current.accountMap.has('acc2')).toBe(true);
    });

    it('should provide O(1) account lookup', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const checking = result.current.accountMap.get('acc1');

      expect(checking).toBeDefined();
      expect(checking?.name).toBe('Checking');
    });
  });

  describe('getCategoryLabel', () => {
    it('should return formatted category label with icon', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const label = result.current.getCategoryLabel('cat1');

      expect(label).toBe('🍔 Food');
    });

    it('should return category name without icon if no icon', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const label = result.current.getCategoryLabel('cat4');

      expect(label).toBe('Salary');
    });

    it('should return "Unknown Category" for invalid id', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const label = result.current.getCategoryLabel('invalid-id');

      expect(label).toBe('Unknown Category');
    });
  });

  describe('getAccountLabel', () => {
    it('should return account name', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const label = result.current.getAccountLabel('acc1');

      expect(label).toBe('Checking');
    });

    it('should return "Unknown Account" for invalid id', () => {
      const { result } = renderHook(() =>
        useCategoryFormatter(mockCategories, mockAccounts)
      );

      const label = result.current.getAccountLabel('invalid-id');

      expect(label).toBe('Unknown Account');
    });
  });

  describe('memoization', () => {
    it('should memoize results when inputs do not change', () => {
      const { result, rerender } = renderHook(
        ({ categories, accounts }: { categories: Category[]; accounts: Account[] }) =>
          useCategoryFormatter(categories, accounts),
        {
          initialProps: { categories: mockCategories, accounts: mockAccounts },
        }
      );

      const firstResult = result.current.flattenedCategories;

      rerender({ categories: mockCategories, accounts: mockAccounts });

      const secondResult = result.current.flattenedCategories;

      expect(firstResult).toBe(secondResult); // Same reference
    });

    it('should recompute when categories change', () => {
      const { result, rerender } = renderHook(
        ({ categories, accounts }: { categories: Category[]; accounts: Account[] }) =>
          useCategoryFormatter(categories, accounts),
        {
          initialProps: { categories: mockCategories, accounts: mockAccounts },
        }
      );

      const firstResult = result.current.flattenedCategories;

      const newCategories: Category[] = [
        ...mockCategories,
        {
          id: 'cat5',
          name: 'Entertainment',
          type: 'expense' as const,
          parentId: undefined,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      rerender({ categories: newCategories, accounts: mockAccounts });

      const secondResult = result.current.flattenedCategories;

      expect(firstResult).not.toBe(secondResult); // Different reference
      expect(secondResult).toHaveLength(5);
    });
  });
});
