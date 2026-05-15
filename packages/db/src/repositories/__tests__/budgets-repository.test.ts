import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { BudgetsRepository } from '../budgets-repository';
import { CategoriesRepository } from '../categories-repository';
import { TransactionsRepository } from '../transactions-repository';
import { AccountsRepository } from '../accounts-repository';
import { createTestDatabase, InMemorySqliteDatabase } from './test-utils';

describe('BudgetsRepository', () => {
  let db: InMemorySqliteDatabase;
  let repo: BudgetsRepository;
  let categoriesRepo: CategoriesRepository;
  let transactionsRepo: TransactionsRepository;
  let accountsRepo: AccountsRepository;
  let categoryId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    repo = new BudgetsRepository(db);
    categoriesRepo = new CategoriesRepository(db);
    transactionsRepo = new TransactionsRepository(db);
    accountsRepo = new AccountsRepository(db);

    const cat = await categoriesRepo.create({ name: 'Food', type: 'expense', color: '#FF5722', icon: '🍔' });
    categoryId = cat.id;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a budget and returns it', async () => {
      const budget = await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });

      expect(budget.id).toBeDefined();
      expect(budget.categoryId).toBe(categoryId);
      expect(budget.amount).toBe(500);
      expect(budget.month).toBe(1);
      expect(budget.year).toBe(2026);
      expect(budget.createdAt).toBeGreaterThan(0);
    });

    it('enforces unique constraint per category per month', async () => {
      await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      await expect(
        repo.create({ categoryId, amount: 600, month: 1, year: 2026 })
      ).rejects.toThrow();
    });

    it('allows same category in different months', async () => {
      const b1 = await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      const b2 = await repo.create({ categoryId, amount: 600, month: 2, year: 2026 });
      expect(b1.month).toBe(1);
      expect(b2.month).toBe(2);
    });
  });

  describe('findById', () => {
    it('returns null for unknown id', async () => {
      expect(await repo.findById('no-such-id')).toBeNull();
    });

    it('returns the budget by id', async () => {
      const created = await repo.create({ categoryId, amount: 300, month: 3, year: 2026 });
      const found = await repo.findById(created.id);
      expect(found?.id).toBe(created.id);
      expect(found?.amount).toBe(300);
    });
  });

  describe('findByPeriod', () => {
    it('returns only budgets for the given month/year', async () => {
      await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      await repo.create({ categoryId, amount: 600, month: 2, year: 2026 });

      const jan = await repo.findByPeriod(1, 2026);
      expect(jan).toHaveLength(1);
      expect(jan[0].month).toBe(1);

      const feb = await repo.findByPeriod(2, 2026);
      expect(feb).toHaveLength(1);
      expect(feb[0].month).toBe(2);
    });

    it('returns empty array when no budgets exist for period', async () => {
      const result = await repo.findByPeriod(6, 2025);
      expect(result).toHaveLength(0);
    });
  });

  describe('findByPeriodWithProgress', () => {
    it('returns zero spent when no transactions exist', async () => {
      await repo.create({ categoryId, amount: 500, month: 5, year: 2026 });
      const results = await repo.findByPeriodWithProgress(5, 2026);

      expect(results).toHaveLength(1);
      expect(results[0].spent).toBe(0);
      expect(results[0].remaining).toBe(500);
      expect(results[0].percentage).toBe(0);
      expect(results[0].categoryName).toBe('Food');
      expect(results[0].categoryColor).toBe('#FF5722');
      expect(results[0].categoryIcon).toBe('🍔');
    });

    it('counts expense transactions in the month toward spent', async () => {
      const account = await accountsRepo.create({ name: 'Cash', type: 'cash' });
      await repo.create({ categoryId, amount: 500, month: 5, year: 2026 });

      await transactionsRepo.create({
        type: 'expense',
        amount: 120,
        currency: 'USD',
        date: '2026-05-10',
        accountId: account.id,
        categoryId,
      });
      await transactionsRepo.create({
        type: 'expense',
        amount: 80,
        currency: 'USD',
        date: '2026-05-20',
        accountId: account.id,
        categoryId,
      });

      const results = await repo.findByPeriodWithProgress(5, 2026);
      expect(results[0].spent).toBe(200);
      expect(results[0].remaining).toBe(300);
      expect(results[0].percentage).toBeCloseTo(40);
    });

    it('rolls up subcategory spending into parent budget', async () => {
      const sub = await categoriesRepo.create({ name: 'Restaurants', type: 'expense', parentId: categoryId });
      const account = await accountsRepo.create({ name: 'Cash', type: 'cash' });
      await repo.create({ categoryId, amount: 500, month: 5, year: 2026 });

      await transactionsRepo.create({
        type: 'expense',
        amount: 60,
        currency: 'USD',
        date: '2026-05-05',
        accountId: account.id,
        categoryId: sub.id,
      });

      const results = await repo.findByPeriodWithProgress(5, 2026);
      expect(results[0].spent).toBe(60);
    });

    it('excludes transactions outside the month', async () => {
      const account = await accountsRepo.create({ name: 'Cash', type: 'cash' });
      await repo.create({ categoryId, amount: 500, month: 5, year: 2026 });

      await transactionsRepo.create({
        type: 'expense',
        amount: 100,
        currency: 'USD',
        date: '2026-04-30',
        accountId: account.id,
        categoryId,
      });

      const results = await repo.findByPeriodWithProgress(5, 2026);
      expect(results[0].spent).toBe(0);
    });
  });

  describe('update', () => {
    it('updates the budget amount', async () => {
      const created = await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      const updated = await repo.update({ id: created.id, amount: 750 });
      expect(updated.amount).toBe(750);
    });

    it('throws for unknown id', async () => {
      await expect(repo.update({ id: 'no-such-id', amount: 100 })).rejects.toThrow();
    });
  });

  describe('delete (soft)', () => {
    it('hides the budget from all read queries after deletion', async () => {
      const created = await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      await repo.delete(created.id);
      expect(await repo.findById(created.id)).toBeNull();
      expect(await repo.findByPeriod(1, 2026)).toHaveLength(0);
    });

    it('throws for unknown id', async () => {
      await expect(repo.delete('no-such-id')).rejects.toThrow();
    });

    it('throws when deleting an already soft-deleted budget', async () => {
      const created = await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      await repo.delete(created.id);
      await expect(repo.delete(created.id)).rejects.toThrow();
    });
  });

  describe('soft-delete as stop signal for findPrecedingDefaults', () => {
    it('does not propagate when the most recent prior row is soft-deleted', async () => {
      await repo.create({ categoryId, amount: 500, month: 4, year: 2026 });
      const may = await repo.create({ categoryId, amount: 500, month: 5, year: 2026 });
      await repo.delete(may.id);

      // June: most recent row for this category before June is May (deleted) → no propagation
      const defaults = await repo.findPrecedingDefaults(6, 2026);
      expect(defaults.find((d) => d.categoryId === categoryId)).toBeUndefined();
    });

    it('still propagates from an older active row when a newer row exists for a different category', async () => {
      const cat2 = await categoriesRepo.create({ name: 'Transport', type: 'expense' });
      await repo.create({ categoryId, amount: 500, month: 4, year: 2026 });
      const cat2May = await repo.create({ categoryId: cat2.id, amount: 200, month: 5, year: 2026 });
      await repo.delete(cat2May.id);

      const defaults = await repo.findPrecedingDefaults(6, 2026);
      // categoryId (Food) should propagate from April, cat2 should not (deleted May row is stop signal)
      expect(defaults.find((d) => d.categoryId === categoryId)?.amount).toBe(500);
      expect(defaults.find((d) => d.categoryId === cat2.id)).toBeUndefined();
    });
  });

  describe('reactivation via create', () => {
    it('reactivates a soft-deleted budget with the new amount', async () => {
      const created = await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      await repo.delete(created.id);
      expect(await repo.findById(created.id)).toBeNull();

      const reactivated = await repo.create({ categoryId, amount: 750, month: 1, year: 2026 });
      expect(reactivated.id).toBe(created.id);
      expect(reactivated.amount).toBe(750);
      expect(await repo.findById(created.id)).not.toBeNull();
    });

    it('reactivated budget is visible in findByPeriod and findByPeriodWithProgress', async () => {
      const created = await repo.create({ categoryId, amount: 500, month: 1, year: 2026 });
      await repo.delete(created.id);
      await repo.create({ categoryId, amount: 750, month: 1, year: 2026 });

      const period = await repo.findByPeriod(1, 2026);
      expect(period).toHaveLength(1);
      expect(period[0].amount).toBe(750);

      const progress = await repo.findByPeriodWithProgress(1, 2026);
      expect(progress).toHaveLength(1);
      expect(progress[0].amount).toBe(750);
    });

    it('reactivation clears the stop signal so propagation resumes', async () => {
      const may = await repo.create({ categoryId, amount: 500, month: 5, year: 2026 });
      await repo.delete(may.id);

      // Re-create May with new amount → stop signal cleared
      await repo.create({ categoryId, amount: 600, month: 5, year: 2026 });

      const defaults = await repo.findPrecedingDefaults(6, 2026);
      expect(defaults.find((d) => d.categoryId === categoryId)?.amount).toBe(600);
    });
  });
});
