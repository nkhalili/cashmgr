/**
 * Category utility functions
 * Shared utilities for working with categories, including parent-child relationships
 */

import type { Category } from '../models/Category';
import type { CategoryAggregation } from '../types';

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

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Build a parent/child tree out of flat per-category aggregation rows.
 *
 * Sub-category totals are rolled up into their parent's total, and the parent's
 * percentage is relative to the grand total, while each sub-category's percentage
 * is relative to its parent's (rolled-up) total.
 *
 * Parents that have no transactions of their own but do have sub-category spending
 * still appear (using the category's own name/icon/color) with a total equal to the
 * sum of their sub-categories.
 *
 * @param aggregations - Flat aggregation rows, one per category that has transactions
 * @param categories - Full category list, used to resolve parent/child relationships
 *   and to fill in name/icon/color for parents with no direct transactions
 * @returns Top-level aggregations, each with rolled-up totals and a `subcategories` array
 */
export function buildCategoryAggregationTree(
  aggregations: CategoryAggregation[],
  categories: Category[],
): CategoryAggregation[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const aggregationById = new Map(aggregations.map((a) => [a.categoryId, a]));
  const nodeById = new Map<string, CategoryAggregation>();

  const getOrCreateNode = (categoryId: string): CategoryAggregation | null => {
    const existing = nodeById.get(categoryId);
    if (existing) return existing;

    const category = categoryById.get(categoryId);
    const agg = aggregationById.get(categoryId);
    if (!category && !agg) return null;

    const node: CategoryAggregation = {
      categoryId,
      categoryName: category ? category.name : agg!.categoryName,
      categoryIcon: category ? (category.icon ?? null) : agg!.categoryIcon,
      categoryColor: category ? (category.color ?? null) : agg!.categoryColor,
      parentId: category?.parentId ?? null,
      total: agg?.total ?? 0,
      count: agg?.count ?? 0,
      subcategories: [],
    };
    nodeById.set(categoryId, node);
    return node;
  };

  for (const agg of aggregations) {
    const node = getOrCreateNode(agg.categoryId)!;
    const parentId = categoryById.get(agg.categoryId)?.parentId;

    if (parentId) {
      const parentNode = getOrCreateNode(parentId);
      if (parentNode) {
        parentNode.total += agg.total;
        parentNode.count += agg.count;
        parentNode.subcategories!.push(node);
      }
    }
  }

  const topLevelNodes = Array.from(nodeById.values()).filter((node) => !node.parentId);
  const grandTotal = topLevelNodes.reduce((sum, node) => sum + node.total, 0);

  return topLevelNodes
    .map((node) => ({
      ...node,
      percentage: grandTotal > 0 ? roundToOneDecimal((node.total / grandTotal) * 100) : 0,
      subcategories: (node.subcategories ?? [])
        .map((child) => ({
          ...child,
          percentage: node.total > 0 ? roundToOneDecimal((child.total / node.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}
