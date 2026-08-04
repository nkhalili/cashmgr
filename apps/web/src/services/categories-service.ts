import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  DatabaseAdapter,
  CategoryType,
} from '@cashmgr/core';
import {
  CreateCategoryInputSchema,
  UpdateCategoryInputSchema,
  ErrorHandler,
  NotFoundError,
  ValidationError,
  validateCategoryBusinessRules,
} from '@cashmgr/core';

/**
 * F-003: Default category templates
 * Used for "Use template" feature
 */
const DEFAULT_INCOME_CATEGORIES: CreateCategoryInput[] = [
  { name: 'Salary', type: 'income', icon: '\u{1F4B0}', color: '#4CAF50' },
  { name: 'Freelance', type: 'income', icon: '\u{1F4BC}', color: '#8BC34A' },
  { name: 'Investments', type: 'income', icon: '\u{1F4C8}', color: '#00BCD4' },
  { name: 'Gifts', type: 'income', icon: '\u{1F381}', color: '#E91E63' },
  { name: 'Other Income', type: 'income', icon: '\u{1F4B5}', color: '#9E9E9E' },
];

const DEFAULT_EXPENSE_CATEGORIES: CreateCategoryInput[] = [
  { name: 'Groceries', type: 'expense', icon: '\u{1F6D2}', color: '#FF9800' },
  { name: 'Housing', type: 'expense', icon: '\u{1F3E0}', color: '#2196F3' },
  { name: 'Utilities', type: 'expense', icon: '\u{1F4A1}', color: '#FFC107' },
  { name: 'Transport', type: 'expense', icon: '\u{1F697}', color: '#9C27B0' },
  { name: 'Dining', type: 'expense', icon: '\u{1F37D}', color: '#F44336' },
  { name: 'Entertainment', type: 'expense', icon: '\u{1F3AE}', color: '#673AB7' },
  { name: 'Shopping', type: 'expense', icon: '\u{1F455}', color: '#FF5722' },
  { name: 'Healthcare', type: 'expense', icon: '\u{1F48A}', color: '#03A9F4' },
  { name: 'Education', type: 'expense', icon: '\u{1F4DA}', color: '#795548' },
  { name: 'Coffee', type: 'expense', icon: '\u{2615}', color: '#8D6E63' },
  { name: 'Subscription', type: 'expense', icon: '\u{1F4F1}', color: '#009688' },
];

/**
 * F-003: CategoriesService
 * Manages transaction categories with subcategory support
 *
 * Features:
 * - CRUD operations for categories
 * - Subcategory support (one level deep)
 * - Default category templates
 * - Validation for business rules
 */
export class CategoriesService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  /**
   * Get all categories
   * @param activeOnly - If true, only return active categories
   */
  async listCategories(activeOnly = true): Promise<Category[]> {
    try {
      return await this.adapter.getCategories(activeOnly);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.listCategories');
    }
  }

  /**
   * Get categories by type
   * @param type - 'income' or 'expense'
   * @param activeOnly - If true, only return active categories
   */
  async listCategoriesByType(type: CategoryType, activeOnly = true): Promise<Category[]> {
    try {
      return await this.adapter.getCategoriesByType(type, activeOnly);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.listCategoriesByType');
    }
  }

  /**
   * Get top-level categories (no parent)
   * @param activeOnly - If true, only return active categories
   */
  async listTopLevelCategories(activeOnly = true): Promise<Category[]> {
    try {
      return await this.adapter.getTopLevelCategories(activeOnly);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.listTopLevelCategories');
    }
  }

  /**
   * Get subcategories of a parent category
   * @param parentId - Parent category ID
   * @param activeOnly - If true, only return active categories
   */
  async listSubcategories(parentId: string, activeOnly = true): Promise<Category[]> {
    try {
      return await this.adapter.getSubcategories(parentId, activeOnly);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.listSubcategories');
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    try {
      const category = await this.adapter.getCategoryById(id);
      if (!category) {
        throw new NotFoundError('Category', id);
      }
      return category;
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.getCategoryById');
    }
  }

  /**
   * Create a new category
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    try {
      // Validate input schema
      const validated = CreateCategoryInputSchema.parse(input);

      // If parentId is provided, validate it exists and has no parent (one level only)
      if (validated.parentId) {
        const parent = await this.adapter.getCategoryById(validated.parentId);
        if (!parent) {
          throw new NotFoundError('Parent category', validated.parentId);
        }
        validateCategoryBusinessRules(validated, parent);
      }

      // Create category
      return await this.adapter.createCategory(validated);
    } catch (error) {
      // Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'CategoriesService.createCategory');
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, updates: Partial<UpdateCategoryInput>): Promise<Category> {
    try {
      // Verify category exists
      const current = await this.adapter.getCategoryById(id);
      if (!current) {
        throw new NotFoundError('Category', id);
      }

      // Prepare update input
      const updateInput: UpdateCategoryInput = { id };

      if (updates.name !== undefined) updateInput.name = updates.name;
      if (updates.type !== undefined) updateInput.type = updates.type;
      if (updates.color !== undefined) updateInput.color = updates.color;
      if (updates.icon !== undefined) updateInput.icon = updates.icon;
      if (updates.isActive !== undefined) updateInput.isActive = updates.isActive;

      // Handle parentId update
      if (updates.parentId !== undefined) {
        updateInput.parentId = updates.parentId;

        // If setting a parent, validate business rules
        if (updates.parentId) {
          const parent = await this.adapter.getCategoryById(updates.parentId);
          if (!parent) {
            throw new NotFoundError('Parent category', updates.parentId);
          }
          validateCategoryBusinessRules({ parentId: updates.parentId }, parent);

          // Cannot set parent on a category that has children
          const hasChildren = await this.adapter.hasSubcategories(id);
          if (hasChildren) {
            throw new Error('Cannot set parent on a category that has subcategories');
          }
        }
      }

      // Validate with schema
      const validated = UpdateCategoryInputSchema.parse(updateInput);

      // Update category
      return await this.adapter.updateCategory(validated);
    } catch (error) {
      // Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'CategoriesService.updateCategory');
    }
  }

  /**
   * Delete a category (soft delete)
   * Will also deactivate subcategories
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      // Verify category exists
      const category = await this.adapter.getCategoryById(id);
      if (!category) {
        throw new NotFoundError('Category', id);
      }

      // If category has subcategories, delete them first
      const subcategories = await this.adapter.getSubcategories(id, true);
      for (const sub of subcategories) {
        await this.adapter.deleteCategory(sub.id);
      }

      // Delete the category
      await this.adapter.deleteCategory(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.deleteCategory');
    }
  }

  /**
   * Check if a category has subcategories
   */
  async hasSubcategories(id: string): Promise<boolean> {
    try {
      return await this.adapter.hasSubcategories(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.hasSubcategories');
    }
  }

  /**
   * Create default categories from template
   * Creates common income and expense categories
   */
  async createDefaultCategories(): Promise<Category[]> {
    try {
      const created: Category[] = [];

      // Create income categories
      for (const cat of DEFAULT_INCOME_CATEGORIES) {
        const category = await this.adapter.createCategory(cat);
        created.push(category);
      }

      // Create expense categories
      for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        const category = await this.adapter.createCategory(cat);
        created.push(category);
      }

      return created;
    } catch (error) {
      throw ErrorHandler.handle(error, 'CategoriesService.createDefaultCategories');
    }
  }
}
