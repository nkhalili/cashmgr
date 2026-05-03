/**
 * Tests for CategoriesService
 *
 * Verifies CRUD operations, parent-child relationships, validation,
 * and hierarchy management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CategoriesService } from '../categories-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import { ValidationError, NotFoundError } from '@cashmgr/core';
import type { CreateCategoryInput } from '@cashmgr/core';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let adapter: MockDatabaseAdapter;

  beforeEach(() => {
    adapter = new MockDatabaseAdapter();
    service = new CategoriesService(adapter);
  });

  describe('listCategories', () => {
    it('should return empty array when no categories exist', async () => {
      const categories = await service.listCategories();
      expect(categories).toEqual([]);
    });

    it('should return all categories', async () => {
      await adapter.createCategory({ name: 'Food', type: 'expense' });
      await adapter.createCategory({ name: 'Salary', type: 'income' });

      const categories = await service.listCategories();
      expect(categories).toHaveLength(2);
    });

    it('should filter inactive categories by default', async () => {
      const active = await adapter.createCategory({ name: 'Active', type: 'expense' });
      const inactive = await adapter.createCategory({ name: 'Inactive', type: 'expense' });
      await adapter.updateCategory({ id: inactive.id, isActive: false });

      const categories = await service.listCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].id).toBe(active.id);
    });

    it('should include inactive categories when activeOnly=false', async () => {
      await adapter.createCategory({ name: 'Active', type: 'expense' });
      const inactive = await adapter.createCategory({ name: 'Inactive', type: 'expense' });
      await adapter.updateCategory({ id: inactive.id, isActive: false });

      const categories = await service.listCategories(false);
      expect(categories).toHaveLength(2);
    });
  });

  describe('listCategoriesByType', () => {
    it('should return only income categories', async () => {
      await adapter.createCategory({ name: 'Salary', type: 'income' });
      await adapter.createCategory({ name: 'Food', type: 'expense' });
      await adapter.createCategory({ name: 'Freelance', type: 'income' });

      const incomeCategories = await service.listCategoriesByType('income');
      expect(incomeCategories).toHaveLength(2);
      expect(incomeCategories.every(c => c.type === 'income')).toBe(true);
    });

    it('should return only expense categories', async () => {
      await adapter.createCategory({ name: 'Salary', type: 'income' });
      await adapter.createCategory({ name: 'Food', type: 'expense' });
      await adapter.createCategory({ name: 'Transport', type: 'expense' });

      const expenseCategories = await service.listCategoriesByType('expense');
      expect(expenseCategories).toHaveLength(2);
      expect(expenseCategories.every(c => c.type === 'expense')).toBe(true);
    });

    it('should filter inactive categories by default', async () => {
      const active = await adapter.createCategory({ name: 'Active', type: 'expense' });
      const inactive = await adapter.createCategory({ name: 'Inactive', type: 'expense' });
      await adapter.updateCategory({ id: inactive.id, isActive: false });

      const categories = await service.listCategoriesByType('expense');
      expect(categories).toHaveLength(1);
      expect(categories[0].id).toBe(active.id);
    });
  });

  describe('listTopLevelCategories', () => {
    it('should return only categories without parents', async () => {
      const parent = await adapter.createCategory({ name: 'Food', type: 'expense' });
      await adapter.createCategory({ name: 'Groceries', type: 'expense', parentId: parent.id });
      await adapter.createCategory({ name: 'Transport', type: 'expense' });

      const topLevel = await service.listTopLevelCategories();
      expect(topLevel).toHaveLength(2);
      expect(topLevel.every(c => !c.parentId)).toBe(true);
    });
  });

  describe('listSubcategories', () => {
    it('should return subcategories of a parent', async () => {
      const parent = await adapter.createCategory({ name: 'Food', type: 'expense' });
      await adapter.createCategory({ name: 'Groceries', type: 'expense', parentId: parent.id });
      await adapter.createCategory({ name: 'Dining', type: 'expense', parentId: parent.id });
      await adapter.createCategory({ name: 'Transport', type: 'expense' });

      const subcategories = await service.listSubcategories(parent.id);
      expect(subcategories).toHaveLength(2);
      expect(subcategories.every(c => c.parentId === parent.id)).toBe(true);
    });

    it('should return empty array if no subcategories exist', async () => {
      const category = await adapter.createCategory({ name: 'Food', type: 'expense' });

      const subcategories = await service.listSubcategories(category.id);
      expect(subcategories).toEqual([]);
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      const created = await adapter.createCategory({ name: 'Food', type: 'expense' });

      const category = await service.getCategoryById(created.id);
      expect(category.id).toBe(created.id);
      expect(category.name).toBe('Food');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      await expect(service.getCategoryById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createCategory', () => {
    it('should create category with valid input', async () => {
      const input: CreateCategoryInput = {
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        color: '#FF5722',
      };

      const category = await service.createCategory(input);

      expect(category.name).toBe('Food');
      expect(category.type).toBe('expense');
      expect(category.icon).toBe('🍔');
      expect(category.color).toBe('#FF5722');
      expect(category.isActive).toBe(true);
      expect(category.parentId).toBeUndefined();
    });

    it('should create category with minimal input', async () => {
      const input: CreateCategoryInput = {
        name: 'Transport',
        type: 'expense',
      };

      const category = await service.createCategory(input);
      expect(category.name).toBe('Transport');
      expect(category.type).toBe('expense');
    });

    it('should reject empty category name', async () => {
      const input: CreateCategoryInput = {
        name: '',
        type: 'expense',
      };

      await expect(service.createCategory(input)).rejects.toThrow(ValidationError);
    });

    it('should reject invalid category type', async () => {
      const input = {
        name: 'Test',
        type: 'invalid-type',
      } as unknown as CreateCategoryInput;

      await expect(service.createCategory(input)).rejects.toThrow(ValidationError);
    });

    it('should create subcategory with valid parent', async () => {
      const parent = await adapter.createCategory({ name: 'Food', type: 'expense' });

      const subcategory = await service.createCategory({
        name: 'Groceries',
        type: 'expense',
        parentId: parent.id,
      });

      expect(subcategory.parentId).toBe(parent.id);
      expect(subcategory.type).toBe('expense');
    });

    it('should throw NotFoundError when parent does not exist', async () => {
      const input: CreateCategoryInput = {
        name: 'Groceries',
        type: 'expense',
        parentId: 'non-existent-parent',
      };

      await expect(service.createCategory(input)).rejects.toThrow(NotFoundError);
    });

    it('should reject subcategory with parent that already has a parent', async () => {
      const grandparent = await adapter.createCategory({ name: 'Food', type: 'expense' });
      const parent = await adapter.createCategory({
        name: 'Fast Food',
        type: 'expense',
        parentId: grandparent.id,
      });

      const input: CreateCategoryInput = {
        name: 'Burgers',
        type: 'expense',
        parentId: parent.id, // Parent already has a parent (grandparent)
      };

      await expect(service.createCategory(input)).rejects.toThrow(
        'Subcategories can only be one level deep'
      );
    });

    it('should trim category name', async () => {
      const input: CreateCategoryInput = {
        name: '  Food  ',
        type: 'expense',
      };

      const category = await service.createCategory(input);
      expect(category.name).toBe('Food');
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const created = await adapter.createCategory({ name: 'Old Name', type: 'expense' });

      const updated = await service.updateCategory(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe('expense');
    });

    it('should update category type', async () => {
      const created = await adapter.createCategory({ name: 'Category', type: 'expense' });

      const updated = await service.updateCategory(created.id, { type: 'income' });

      expect(updated.type).toBe('income');
      expect(updated.name).toBe('Category');
    });

    it('should update category icon and color', async () => {
      const created = await adapter.createCategory({ name: 'Food', type: 'expense' });

      const updated = await service.updateCategory(created.id, {
        icon: '🍕',
        color: '#FF9800',
      });

      expect(updated.icon).toBe('🍕');
      expect(updated.color).toBe('#FF9800');
    });

    it('should deactivate category', async () => {
      const created = await adapter.createCategory({ name: 'Food', type: 'expense' });

      const updated = await service.updateCategory(created.id, { isActive: false });

      expect(updated.isActive).toBe(false);
    });

    it('should update multiple fields at once', async () => {
      const created = await adapter.createCategory({ name: 'Old', type: 'expense' });

      const updated = await service.updateCategory(created.id, {
        name: 'New',
        type: 'income',
        icon: '💰',
        color: '#4CAF50',
      });

      expect(updated.name).toBe('New');
      expect(updated.type).toBe('income');
      expect(updated.icon).toBe('💰');
      expect(updated.color).toBe('#4CAF50');
    });

    it('should throw NotFoundError for non-existent category', async () => {
      await expect(
        service.updateCategory('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when setting non-existent parent', async () => {
      const category = await adapter.createCategory({ name: 'Food', type: 'expense' });

      await expect(
        service.updateCategory(category.id, { parentId: 'non-existent-parent' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject setting parent on category with subcategories', async () => {
      const parent = await adapter.createCategory({ name: 'Food', type: 'expense' });
      await adapter.createCategory({
        name: 'Groceries',
        type: 'expense',
        parentId: parent.id,
      });
      const newParent = await adapter.createCategory({ name: 'Shopping', type: 'expense' });

      await expect(
        service.updateCategory(parent.id, { parentId: newParent.id })
      ).rejects.toThrow('Cannot set parent on a category that has subcategories');
    });

    it('should reject empty name update', async () => {
      const category = await adapter.createCategory({ name: 'Food', type: 'expense' });

      await expect(
        service.updateCategory(category.id, { name: '' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteCategory', () => {
    it('should delete existing category', async () => {
      const created = await adapter.createCategory({ name: 'Food', type: 'expense' });

      await service.deleteCategory(created.id);

      const category = await adapter.getCategoryById(created.id);
      expect(category).toBeNull();
    });

    it('should cascade delete subcategories', async () => {
      const parent = await adapter.createCategory({ name: 'Food', type: 'expense' });
      const child1 = await adapter.createCategory({
        name: 'Groceries',
        type: 'expense',
        parentId: parent.id,
      });
      const child2 = await adapter.createCategory({
        name: 'Dining',
        type: 'expense',
        parentId: parent.id,
      });

      await service.deleteCategory(parent.id);

      expect(await adapter.getCategoryById(parent.id)).toBeNull();
      expect(await adapter.getCategoryById(child1.id)).toBeNull();
      expect(await adapter.getCategoryById(child2.id)).toBeNull();
    });

    it('should throw NotFoundError for non-existent category', async () => {
      await expect(service.deleteCategory('non-existent-id')).rejects.toThrow(NotFoundError);
    });

    it('should not affect other categories', async () => {
      const cat1 = await adapter.createCategory({ name: 'Food', type: 'expense' });
      const cat2 = await adapter.createCategory({ name: 'Delete Me', type: 'expense' });
      const cat3 = await adapter.createCategory({ name: 'Transport', type: 'expense' });

      await service.deleteCategory(cat2.id);

      const remaining = await adapter.getCategories();
      expect(remaining).toHaveLength(2);
      expect(remaining.map(c => c.id)).toEqual([cat1.id, cat3.id]);
    });
  });

  describe('hasSubcategories', () => {
    it('should return true when category has subcategories', async () => {
      const parent = await adapter.createCategory({ name: 'Food', type: 'expense' });
      await adapter.createCategory({ name: 'Groceries', type: 'expense', parentId: parent.id });

      const hasChildren = await service.hasSubcategories(parent.id);
      expect(hasChildren).toBe(true);
    });

    it('should return false when category has no subcategories', async () => {
      const category = await adapter.createCategory({ name: 'Food', type: 'expense' });

      const hasChildren = await service.hasSubcategories(category.id);
      expect(hasChildren).toBe(false);
    });
  });

  describe('createDefaultCategories', () => {
    it('should create default income and expense categories', async () => {
      const categories = await service.createDefaultCategories();

      // Should create 5 income + 9 expense categories
      expect(categories.length).toBeGreaterThanOrEqual(10);

      const incomeCategories = categories.filter(c => c.type === 'income');
      const expenseCategories = categories.filter(c => c.type === 'expense');

      expect(incomeCategories.length).toBeGreaterThanOrEqual(5);
      expect(expenseCategories.length).toBeGreaterThanOrEqual(9);
    });

    it('should create categories with icons and colors', async () => {
      const categories = await service.createDefaultCategories();

      categories.forEach(category => {
        expect(category.icon).toBeDefined();
        expect(category.color).toBeDefined();
        expect(category.isActive).toBe(true);
        expect(category.parentId).toBeUndefined();
      });
    });

    it('should persist all default categories', async () => {
      await service.createDefaultCategories();

      const stored = await adapter.getCategories();
      expect(stored.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full category lifecycle', async () => {
      // Create
      const created = await service.createCategory({
        name: 'Food',
        type: 'expense',
        icon: '🍔',
      });
      expect(created.id).toBeDefined();

      // List
      const categories = await service.listCategories();
      expect(categories).toHaveLength(1);

      // Update
      const updated = await service.updateCategory(created.id, { name: 'Dining' });
      expect(updated.name).toBe('Dining');

      // Delete
      await service.deleteCategory(created.id);
      const final = await service.listCategories();
      expect(final).toHaveLength(0);
    });

    it('should handle parent-child hierarchy', async () => {
      // Create parent
      const parent = await service.createCategory({ name: 'Food', type: 'expense' });

      // Create children
      await service.createCategory({
        name: 'Groceries',
        type: 'expense',
        parentId: parent.id,
      });
      await service.createCategory({
        name: 'Dining',
        type: 'expense',
        parentId: parent.id,
      });

      // Verify hierarchy
      const topLevel = await service.listTopLevelCategories();
      expect(topLevel).toHaveLength(1);

      const subcategories = await service.listSubcategories(parent.id);
      expect(subcategories).toHaveLength(2);

      const hasChildren = await service.hasSubcategories(parent.id);
      expect(hasChildren).toBe(true);

      // Delete parent cascades to children
      await service.deleteCategory(parent.id);
      const remaining = await service.listCategories();
      expect(remaining).toHaveLength(0);
    });
  });
});
