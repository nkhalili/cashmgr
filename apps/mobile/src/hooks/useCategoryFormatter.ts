/**
 * useCategoryFormatter Hook
 *
 * Replaces inline category flattening logic with shared category-utils.
 * Provides formatted category data and lookup maps for efficient access.
 *
 * Features:
 * - Uses category-utils.flattenCategories() for hierarchy
 * - Uses category-utils.formatCategoryLabel() for consistent formatting
 * - Provides Maps for O(1) lookup performance
 * - Memoizes results to prevent unnecessary recomputations
 */

import React from 'react';
import type { Category, Account } from '@cashmgr/core';
import { flattenCategories, formatCategoryLabel } from '@cashmgr/core';

/**
 * useCategoryFormatter Hook
 *
 * @param categories - List of categories (including parents and children)
 * @param accounts - List of accounts for map creation
 * @returns Flattened categories, category map, and account map
 */
export function useCategoryFormatter(categories: Category[], accounts: Account[]) {
  // Flatten categories with parent-child hierarchy
  const flattenedCategories = React.useMemo(() => {
    return flattenCategories(categories);
  }, [categories]);

  // Create category lookup map for O(1) access
  const categoryMap = React.useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Create account lookup map for O(1) access
  const accountMap = React.useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  // Helper function to format category label with icon
  const getCategoryLabel = React.useCallback(
    (categoryId: string): string => {
      const category = categoryMap.get(categoryId);
      if (!category) return 'Unknown Category';
      return formatCategoryLabel(category);
    },
    [categoryMap]
  );

  // Helper function to format account label
  const getAccountLabel = React.useCallback(
    (accountId: string): string => {
      const account = accountMap.get(accountId);
      return account ? account.name : 'Unknown Account';
    },
    [accountMap]
  );

  return {
    flattenedCategories,
    categoryMap,
    accountMap,
    getCategoryLabel,
    getAccountLabel,
  };
}
