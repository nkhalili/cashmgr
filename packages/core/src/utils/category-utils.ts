/**
 * Category utility functions
 * Shared utilities for working with categories, including parent-child relationships
 */

import type { Category } from '../models/Category';

/**
 * Flattened category with display metadata
 */
export interface FlatCategory extends Category {
  /**
   * Whether this is a child category (has a parent)
   */
  isChild: boolean;

  /**
   * Formatted label for display (includes icon and indentation for children)
   */
  label: string;
}

/**
 * Format a category label with icon
 * @param category - Category to format
 * @returns Formatted label string
 *
 * @example
 * formatCategoryLabel({ name: 'Food', icon: '🍔' });
 * // Returns: "🍔 Food"
 *
 * @example
 * formatCategoryLabel({ name: 'Groceries' });
 * // Returns: "Groceries"
 */
export function formatCategoryLabel(category: Pick<Category, 'name' | 'icon'>): string {
  return category.icon ? `${category.icon} ${category.name}` : category.name;
}

/**
 * Flatten a hierarchical category list into a flat list with parent-child ordering
 * Parent categories are listed first, followed by their children (indented)
 *
 * This is useful for displaying categories in a select dropdown or list
 * where the hierarchy needs to be preserved but in a flat structure.
 *
 * @param categories - Array of categories (can include both parents and children)
 * @returns Flattened array with parents followed by their children
 *
 * @example
 * const categories = [
 *   { id: '1', name: 'Food', icon: '🍔', parentId: null },
 *   { id: '2', name: 'Groceries', icon: '🛒', parentId: '1' },
 *   { id: '3', name: 'Transport', icon: '🚗', parentId: null }
 * ];
 *
 * flattenCategories(categories);
 * // Returns:
 * // [
 * //   { ...food, isChild: false, label: '🍔 Food' },
 * //   { ...groceries, isChild: true, label: '  🛒 Groceries' },
 * //   { ...transport, isChild: false, label: '🚗 Transport' }
 * // ]
 */
export function flattenCategories(categories: Category[]): FlatCategory[] {
  const result: FlatCategory[] = [];

  // Get all parent categories (no parentId)
  const parentCategories = categories.filter((c) => !c.parentId);

  // Sort parents by name for consistent ordering
  parentCategories.sort((a, b) => a.name.localeCompare(b.name));

  for (const parent of parentCategories) {
    // Add parent category
    result.push({
      ...parent,
      isChild: false,
      label: formatCategoryLabel(parent),
    });

    // Find and add children of this parent
    const children = categories.filter((c) => c.parentId === parent.id);

    // Sort children by name
    children.sort((a, b) => a.name.localeCompare(b.name));

    for (const child of children) {
      result.push({
        ...child,
        isChild: true,
        label: `  ${formatCategoryLabel(child)}`, // Indent with 2 spaces
      });
    }
  }

  return result;
}

/**
 * Group categories by type (income/expense)
 * @param categories - Array of categories
 * @returns Object with income and expense category arrays
 *
 * @example
 * groupCategoriesByType(categories);
 * // Returns: { income: [...], expense: [...] }
 */
export function groupCategoriesByType(categories: Category[]): {
  income: Category[];
  expense: Category[];
} {
  return {
    income: categories.filter((c) => c.type === 'income'),
    expense: categories.filter((c) => c.type === 'expense'),
  };
}

/**
 * Get all parent categories (categories without a parent)
 * @param categories - Array of categories
 * @returns Array of parent categories
 */
export function getParentCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !c.parentId);
}

/**
 * Get children of a specific category
 * @param categories - Array of all categories
 * @param parentId - ID of the parent category
 * @returns Array of child categories
 */
export function getChildCategories(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId);
}
