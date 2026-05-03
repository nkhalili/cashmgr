import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CategoriesRepository } from '../categories-repository';
import { createTestDatabase, InMemorySqliteDatabase } from './test-utils';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;
  let db: InMemorySqliteDatabase;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new CategoriesRepository(db);
  });

  afterEach(async () => {
    await db.close();
    vi.useRealTimers();
  });

  describe('create', () => {
    it('creates a category with defaults', async () => {
      vi.useFakeTimers();
      const createdAt = new Date('2024-01-15T10:00:00Z');
      vi.setSystemTime(createdAt);

      const category = await repository.create({
        name: 'Food',
        type: 'expense',
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('Food');
      expect(category.type).toBe('expense');
      expect(category.color).toBeUndefined();
      expect(category.icon).toBeUndefined();
      expect(category.parentId).toBeUndefined();
      expect(category.isActive).toBe(true);
      expect(category.createdAt).toBe(createdAt.getTime());
      expect(category.updatedAt).toBe(createdAt.getTime());
    });

    it('creates a category with all fields', async () => {
      const category = await repository.create({
        name: 'Salary',
        type: 'income',
        color: '#00ff00',
        icon: '💰',
      });

      expect(category.name).toBe('Salary');
      expect(category.type).toBe('income');
      expect(category.color).toBe('#00ff00');
      expect(category.icon).toBe('💰');
    });

    it('creates a subcategory with parent reference', async () => {
      const parent = await repository.create({
        name: 'Food',
        type: 'expense',
      });

      const child = await repository.create({
        name: 'Restaurants',
        type: 'expense',
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
    });
  });

  describe('findById', () => {
    it('returns the category when found', async () => {
      const created = await repository.create({
        name: 'Transport',
        type: 'expense',
      });

      const found = await repository.findById(created.id);
      expect(found).toEqual(created);
    });

    it('returns null when not found', async () => {
      const found = await repository.findById('nonexistent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all categories ordered by parent and name', async () => {
      await repository.create({ name: 'Zebra', type: 'expense' });
      await repository.create({ name: 'Apple', type: 'expense' });

      const categories = await repository.findAll();
      expect(categories).toHaveLength(2);
      // Parent categories first (null parent), then alphabetical
      expect(categories[0].name).toBe('Apple');
      expect(categories[1].name).toBe('Zebra');
    });

    it('filters by active status', async () => {
      const active = await repository.create({ name: 'Active', type: 'expense' });
      const inactive = await repository.create({ name: 'Inactive', type: 'expense' });
      await repository.delete(inactive.id); // Soft delete

      const allCategories = await repository.findAll(false);
      expect(allCategories).toHaveLength(2);

      const activeOnly = await repository.findAll(true);
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].id).toBe(active.id);
    });
  });

  describe('findByType', () => {
    it('returns categories of specified type', async () => {
      await repository.create({ name: 'Groceries', type: 'expense' });
      await repository.create({ name: 'Salary', type: 'income' });
      await repository.create({ name: 'Transport', type: 'expense' });

      const expenses = await repository.findByType('expense');
      expect(expenses).toHaveLength(2);
      expect(expenses.every((c) => c.type === 'expense')).toBe(true);

      const incomes = await repository.findByType('income');
      expect(incomes).toHaveLength(1);
      expect(incomes[0].name).toBe('Salary');
    });

    it('filters by active status', async () => {
      const active = await repository.create({ name: 'Active', type: 'expense' });
      const inactive = await repository.create({ name: 'Inactive', type: 'expense' });
      await repository.delete(inactive.id);

      const activeOnly = await repository.findByType('expense', true);
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].id).toBe(active.id);
    });
  });

  describe('findByParentId', () => {
    it('returns subcategories of parent', async () => {
      const parent = await repository.create({ name: 'Food', type: 'expense' });
      await repository.create({ name: 'Groceries', type: 'expense', parentId: parent.id });
      await repository.create({ name: 'Restaurants', type: 'expense', parentId: parent.id });
      await repository.create({ name: 'Unrelated', type: 'expense' });

      const subcategories = await repository.findByParentId(parent.id);
      expect(subcategories).toHaveLength(2);
      expect(subcategories.every((c) => c.parentId === parent.id)).toBe(true);
    });
  });

  describe('findTopLevel', () => {
    it('returns only categories without parent', async () => {
      const parent = await repository.create({ name: 'Food', type: 'expense' });
      await repository.create({ name: 'Groceries', type: 'expense', parentId: parent.id });
      const topLevel2 = await repository.create({ name: 'Transport', type: 'expense' });

      const topLevel = await repository.findTopLevel();
      expect(topLevel).toHaveLength(2);
      expect(topLevel.map((c) => c.id).sort()).toEqual([parent.id, topLevel2.id].sort());
    });
  });

  describe('update', () => {
    it('updates specified fields', async () => {
      const created = await repository.create({
        name: 'Original',
        type: 'expense',
      });

      vi.useFakeTimers();
      const updatedAt = new Date('2024-02-01T12:00:00Z');
      vi.setSystemTime(updatedAt);

      const updated = await repository.update({
        id: created.id,
        name: 'Updated',
        color: '#ff0000',
        icon: '🍕',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.color).toBe('#ff0000');
      expect(updated.icon).toBe('🍕');
      expect(updated.type).toBe('expense'); // Unchanged
      expect(updated.updatedAt).toBe(updatedAt.getTime());
    });

    it('can change parent', async () => {
      const parent1 = await repository.create({ name: 'Parent 1', type: 'expense' });
      const parent2 = await repository.create({ name: 'Parent 2', type: 'expense' });
      const child = await repository.create({
        name: 'Child',
        type: 'expense',
        parentId: parent1.id,
      });

      const updated = await repository.update({
        id: child.id,
        parentId: parent2.id,
      });

      expect(updated.parentId).toBe(parent2.id);
    });

    it('can remove parent', async () => {
      const parent = await repository.create({ name: 'Parent', type: 'expense' });
      const child = await repository.create({
        name: 'Child',
        type: 'expense',
        parentId: parent.id,
      });

      const updated = await repository.update({
        id: child.id,
        parentId: null,
      });

      expect(updated.parentId).toBeUndefined();
    });

    it('throws when no fields provided', async () => {
      const created = await repository.create({ name: 'Test', type: 'expense' });

      await expect(repository.update({ id: created.id })).rejects.toThrow(
        'No fields provided for update'
      );
    });

    it('throws when category not found', async () => {
      await expect(
        repository.update({ id: 'nonexistent', name: 'Updated' })
      ).rejects.toThrow('Category not found for id: nonexistent');
    });
  });

  describe('delete (soft)', () => {
    it('soft deletes by setting isActive to false', async () => {
      const created = await repository.create({ name: 'To Delete', type: 'expense' });

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.isActive).toBe(false);
    });

    it('throws when category not found', async () => {
      await expect(repository.delete('nonexistent')).rejects.toThrow(
        'Category not found for id: nonexistent'
      );
    });
  });

  describe('hardDelete', () => {
    it('permanently removes the category', async () => {
      const created = await repository.create({ name: 'To Hard Delete', type: 'expense' });

      await repository.hardDelete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('throws when category not found', async () => {
      await expect(repository.hardDelete('nonexistent')).rejects.toThrow(
        'Category not found for id: nonexistent'
      );
    });
  });

  describe('hasSubcategories', () => {
    it('returns true when category has active subcategories', async () => {
      const parent = await repository.create({ name: 'Parent', type: 'expense' });
      await repository.create({ name: 'Child', type: 'expense', parentId: parent.id });

      const result = await repository.hasSubcategories(parent.id);
      expect(result).toBe(true);
    });

    it('returns false when category has no subcategories', async () => {
      const parent = await repository.create({ name: 'Parent', type: 'expense' });

      const result = await repository.hasSubcategories(parent.id);
      expect(result).toBe(false);
    });

    it('returns false when all subcategories are inactive', async () => {
      const parent = await repository.create({ name: 'Parent', type: 'expense' });
      const child = await repository.create({
        name: 'Child',
        type: 'expense',
        parentId: parent.id,
      });
      await repository.delete(child.id); // Soft delete

      const result = await repository.hasSubcategories(parent.id);
      expect(result).toBe(false);
    });
  });
});
