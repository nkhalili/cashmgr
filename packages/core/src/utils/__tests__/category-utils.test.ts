import { describe, expect, it } from 'vitest';
import {
  formatCategoryLabel,
  flattenCategories,
  groupCategoriesByType,
  getParentCategories,
  getChildCategories,
  buildCategoryAggregationTree,
} from '../category-utils';
import type { Category } from '../../models/Category';
import type { CategoryAggregation } from '../../types';

describe('formatCategoryLabel', () => {
  it('should format category with icon and name', () => {
    const category = { name: 'Food', icon: '🍔' };

    const result = formatCategoryLabel(category);

    expect(result).toBe('🍔 Food');
  });

  it('should format category with name only when no icon', () => {
    const category = { name: 'Groceries', icon: undefined };

    const result = formatCategoryLabel(category);

    expect(result).toBe('Groceries');
  });

  it('should handle empty icon string', () => {
    const category = { name: 'Transport', icon: '' };

    const result = formatCategoryLabel(category);

    expect(result).toBe('Transport');
  });
});

describe('flattenCategories', () => {
  it('should return empty array for no categories', () => {
    const result = flattenCategories([]);

    expect(result).toEqual([]);
  });

  it('should flatten single parent category', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = flattenCategories(categories);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '1',
      name: 'Food',
      isChild: false,
      label: '🍔 Food',
    });
  });

  it('should flatten parent with children in correct order', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'Groceries',
        type: 'expense',
        icon: '🛒',
        parentId: '1',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '3',
        name: 'Restaurants',
        type: 'expense',
        icon: '🍽️',
        parentId: '1',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = flattenCategories(categories);

    expect(result).toHaveLength(3);
    // Parent first
    expect(result[0]).toMatchObject({
      id: '1',
      name: 'Food',
      isChild: false,
      label: '🍔 Food',
    });
    // Children sorted by name (Groceries before Restaurants)
    expect(result[1]).toMatchObject({
      id: '2',
      name: 'Groceries',
      isChild: true,
      label: '  🛒 Groceries', // Indented with 2 spaces
    });
    expect(result[2]).toMatchObject({
      id: '3',
      name: 'Restaurants',
      isChild: true,
      label: '  🍽️ Restaurants',
    });
  });

  it('should sort parents alphabetically', () => {
    const categories: Category[] = [
      {
        id: '2',
        name: 'Transport',
        type: 'expense',
        icon: '🚗',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = flattenCategories(categories);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Food');
    expect(result[1].name).toBe('Transport');
  });

  it('should handle multiple parents with children', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'Groceries',
        type: 'expense',
        icon: '🛒',
        parentId: '1',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '3',
        name: 'Transport',
        type: 'expense',
        icon: '🚗',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '4',
        name: 'Fuel',
        type: 'expense',
        icon: '⛽',
        parentId: '3',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = flattenCategories(categories);

    expect(result).toHaveLength(4);
    expect(result[0].name).toBe('Food');
    expect(result[1].name).toBe('Groceries');
    expect(result[1].isChild).toBe(true);
    expect(result[2].name).toBe('Transport');
    expect(result[3].name).toBe('Fuel');
    expect(result[3].isChild).toBe(true);
  });

  it('should indent child categories with 2 spaces', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'Groceries',
        type: 'expense',
        parentId: '1',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = flattenCategories(categories);

    expect(result[0].label).toBe('🍔 Food'); // No indent
    expect(result[1].label).toBe('  Groceries'); // 2 space indent
  });
});

describe('groupCategoriesByType', () => {
  it('should return empty arrays for no categories', () => {
    const result = groupCategoriesByType([]);

    expect(result.income).toEqual([]);
    expect(result.expense).toEqual([]);
  });

  it('should group categories by type', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Salary',
        type: 'income',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'Food',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '3',
        name: 'Freelance',
        type: 'income',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = groupCategoriesByType(categories);

    expect(result.income).toHaveLength(2);
    expect(result.expense).toHaveLength(1);
    expect(result.income[0].name).toBe('Salary');
    expect(result.income[1].name).toBe('Freelance');
    expect(result.expense[0].name).toBe('Food');
  });

  it('should handle only income categories', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Salary',
        type: 'income',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = groupCategoriesByType(categories);

    expect(result.income).toHaveLength(1);
    expect(result.expense).toHaveLength(0);
  });

  it('should handle only expense categories', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = groupCategoriesByType(categories);

    expect(result.income).toHaveLength(0);
    expect(result.expense).toHaveLength(1);
  });
});

describe('getParentCategories', () => {
  it('should return empty array for no categories', () => {
    const result = getParentCategories([]);

    expect(result).toEqual([]);
  });

  it('should return only parent categories', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'Groceries',
        type: 'expense',
        parentId: '1',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '3',
        name: 'Transport',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = getParentCategories(categories);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Food');
    expect(result[1].name).toBe('Transport');
  });

  it('should return all categories when none have parents', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'Transport',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = getParentCategories(categories);

    expect(result).toHaveLength(2);
  });
});

describe('getChildCategories', () => {
  it('should return empty array when no children exist', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = getChildCategories(categories, '1');

    expect(result).toEqual([]);
  });

  it('should return children of specific parent', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '2',
        name: 'Groceries',
        type: 'expense',
        parentId: '1',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '3',
        name: 'Restaurants',
        type: 'expense',
        parentId: '1',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: '4',
        name: 'Transport',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = getChildCategories(categories, '1');

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Groceries');
    expect(result[1].name).toBe('Restaurants');
  });

  it('should return empty array for non-existent parent', () => {
    const categories: Category[] = [
      {
        id: '1',
        name: 'Food',
        type: 'expense',
        parentId: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = getChildCategories(categories, 'non-existent');

    expect(result).toEqual([]);
  });
});

describe('buildCategoryAggregationTree', () => {
  const makeCategory = (overrides: Partial<Category> & Pick<Category, 'id' | 'name'>): Category => ({
    type: 'expense',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  const makeAggregation = (overrides: Partial<CategoryAggregation> & Pick<CategoryAggregation, 'categoryId' | 'categoryName' | 'total' | 'count'>): CategoryAggregation => ({
    categoryIcon: null,
    categoryColor: null,
    ...overrides,
  });

  it('returns empty array when there are no aggregations', () => {
    const result = buildCategoryAggregationTree([], []);
    expect(result).toEqual([]);
  });

  it('rolls up sub-category totals into the parent and computes percentage relative to the parent', () => {
    const categories: Category[] = [
      makeCategory({ id: 'food', name: 'Food' }),
      makeCategory({ id: 'restaurants', name: 'Restaurants', parentId: 'food' }),
      makeCategory({ id: 'groceries', name: 'Groceries', parentId: 'food' }),
    ];
    const aggregations: CategoryAggregation[] = [
      makeAggregation({ categoryId: 'restaurants', categoryName: 'Restaurants', total: 60, count: 2 }),
      makeAggregation({ categoryId: 'groceries', categoryName: 'Groceries', total: 40, count: 1 }),
    ];

    const result = buildCategoryAggregationTree(aggregations, categories);

    expect(result).toHaveLength(1);
    const food = result[0];
    expect(food.categoryId).toBe('food');
    // Parent total is the sum of its sub-categories since it has no direct transactions
    expect(food.total).toBe(100);
    expect(food.percentage).toBe(100);
    expect(food.subcategories).toHaveLength(2);

    const restaurants = food.subcategories!.find((s) => s.categoryId === 'restaurants')!;
    const groceries = food.subcategories!.find((s) => s.categoryId === 'groceries')!;
    // Sub-category percentage is relative to the parent's total, not the grand total
    expect(restaurants.percentage).toBe(60);
    expect(groceries.percentage).toBe(40);
  });

  it('includes the parent own direct total plus its sub-categories', () => {
    const categories: Category[] = [
      makeCategory({ id: 'food', name: 'Food' }),
      makeCategory({ id: 'restaurants', name: 'Restaurants', parentId: 'food' }),
    ];
    const aggregations: CategoryAggregation[] = [
      makeAggregation({ categoryId: 'food', categoryName: 'Food', total: 20, count: 1 }),
      makeAggregation({ categoryId: 'restaurants', categoryName: 'Restaurants', total: 80, count: 2 }),
    ];

    const result = buildCategoryAggregationTree(aggregations, categories);

    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(100);
    expect(result[0].count).toBe(3);
    expect(result[0].subcategories).toHaveLength(1);
    expect(result[0].subcategories![0].percentage).toBe(80);
  });

  it('leaves top-level categories without sub-categories unaffected, percentage relative to grand total', () => {
    const categories: Category[] = [
      makeCategory({ id: 'food', name: 'Food' }),
      makeCategory({ id: 'transport', name: 'Transport' }),
    ];
    const aggregations: CategoryAggregation[] = [
      makeAggregation({ categoryId: 'food', categoryName: 'Food', total: 75, count: 1 }),
      makeAggregation({ categoryId: 'transport', categoryName: 'Transport', total: 25, count: 1 }),
    ];

    const result = buildCategoryAggregationTree(aggregations, categories);

    expect(result).toHaveLength(2);
    const food = result.find((r) => r.categoryId === 'food')!;
    const transport = result.find((r) => r.categoryId === 'transport')!;
    expect(food.percentage).toBe(75);
    expect(transport.percentage).toBe(25);
    expect(food.subcategories).toEqual([]);
  });
});
