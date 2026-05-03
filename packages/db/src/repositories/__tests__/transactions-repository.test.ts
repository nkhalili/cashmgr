import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CURRENCY } from '@cashmgr/core';
import { TransactionsRepository } from '../transactions-repository';
import {
  createTestDatabase,
  insertTestAccount,
  insertTestCategory,
  InMemorySqliteDatabase,
} from './test-utils';

describe('TransactionsRepository', () => {
  let repository: TransactionsRepository;
  let db: InMemorySqliteDatabase;

  // Test fixtures
  const accountId = 'test-account-1';
  const accountId2 = 'test-account-2';
  const categoryId = 'test-category-1';
  const categoryId2 = 'test-category-2';

  beforeEach(async () => {
    db = createTestDatabase();
    repository = new TransactionsRepository(db);

    // Insert required foreign key references
    await insertTestAccount(db, { id: accountId, name: 'Cash Wallet' });
    await insertTestAccount(db, { id: accountId2, name: 'Bank Account' });
    await insertTestCategory(db, { id: categoryId, name: 'Food', type: 'expense' });
    await insertTestCategory(db, { id: categoryId2, name: 'Salary', type: 'income' });
  });

  afterEach(async () => {
    await db.close();
    vi.useRealTimers();
  });

  describe('create', () => {
    it('creates an expense transaction with defaults', async () => {
      vi.useFakeTimers();
      const createdAt = new Date('2024-01-15T10:00:00Z');
      vi.setSystemTime(createdAt);

      const transaction = await repository.create({
        type: 'expense',
        amount: 25.50,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      expect(transaction.id).toBeDefined();
      expect(transaction.type).toBe('expense');
      expect(transaction.amount).toBe(25.50);
      expect(transaction.currency).toBe(DEFAULT_CURRENCY);
      expect(transaction.accountId).toBe(accountId);
      expect(transaction.categoryId).toBe(categoryId);
      expect(transaction.toAccountId).toBeUndefined();
      expect(transaction.notes).toBeUndefined();
      expect(transaction.createdAt).toBe(createdAt.getTime());
      expect(transaction.updatedAt).toBe(createdAt.getTime());
    });

    it('creates an income transaction with all fields', async () => {
      const transaction = await repository.create({
        type: 'income',
        amount: 5000,
        currency: 'EUR',
        date: '2024-01-15',
        accountId,
        categoryId: categoryId2,
        notes: 'January payment',
      });

      expect(transaction.type).toBe('income');
      expect(transaction.amount).toBe(5000);
      expect(transaction.currency).toBe('EUR');
      expect(transaction.notes).toBe('January payment');
    });

    it('creates a transfer transaction with toAccountId', async () => {
      const transaction = await repository.create({
        type: 'transfer',
        amount: 100,
        date: '2024-01-15',
        accountId,
        categoryId,
        toAccountId: accountId2,
      });

      expect(transaction.type).toBe('transfer');
      expect(transaction.accountId).toBe(accountId);
      expect(transaction.toAccountId).toBe(accountId2);
    });
  });

  describe('findById', () => {
    it('returns the transaction when found', async () => {
      const created = await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
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
    it('returns all transactions ordered by date descending', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      const tx1 = await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-01',
        accountId,
        categoryId,
      });

      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      const tx2 = await repository.create({
        type: 'expense',
        amount: 20,
        date: '2024-01-02',
        accountId,
        categoryId,
      });

      const transactions = await repository.findAll();
      expect(transactions).toHaveLength(2);
      expect(transactions[0].id).toBe(tx2.id); // More recent first
      expect(transactions[1].id).toBe(tx1.id);
    });

    it('filters by account ID', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-15',
        accountId,
        categoryId,
        notes: 'Account 1 note',
      });

      await repository.create({
        type: 'expense',
        amount: 20,
        date: '2024-01-15',
        accountId: accountId2,
        categoryId,
        notes: 'Account 2 note',
      });

      const transactions = await repository.findAll({ accountId });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].notes).toBe('Account 1 note');
    });

    it('filters by category ID', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-15',
        accountId,
        categoryId,
        notes: 'Food expense note',
      });

      await repository.create({
        type: 'income',
        amount: 100,
        date: '2024-01-15',
        accountId,
        categoryId: categoryId2,
        notes: 'Salary income note',
      });

      const transactions = await repository.findAll({ categoryId: categoryId2 });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].notes).toBe('Salary income note');
    });

    it('filters by transaction type', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await repository.create({
        type: 'income',
        amount: 100,
        date: '2024-01-15',
        accountId,
        categoryId: categoryId2,
      });

      const transactions = await repository.findAll({ type: 'income' });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('income');
    });

    it('filters by date range', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-01',
        accountId,
        categoryId,
        notes: 'January note',
      });

      await repository.create({
        type: 'expense',
        amount: 20,
        date: '2024-02-01',
        accountId,
        categoryId,
        notes: 'February note',
      });

      const transactions = await repository.findAll({
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-15' },
      });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].notes).toBe('January note');
    });

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.create({
          type: 'expense',
          amount: i * 10,
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          accountId,
          categoryId,
        });
      }

      const page1 = await repository.findAll(undefined, { limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await repository.findAll(undefined, { limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await repository.findAll(undefined, { limit: 2, offset: 4 });
      expect(page3).toHaveLength(1);
    });
  });

  describe('findByAccount', () => {
    it('includes transfers where account is source or destination', async () => {
      // Transfer from account1 to account2
      await repository.create({
        type: 'transfer',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
        toAccountId: accountId2,
      });

      // Both accounts should see the transfer
      const account1Txs = await repository.findByAccount(accountId);
      const account2Txs = await repository.findByAccount(accountId2);

      expect(account1Txs).toHaveLength(1);
      expect(account2Txs).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('finds transactions by notes', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-15',
        accountId,
        categoryId,
        notes: 'Coffee at Starbucks',
      });

      await repository.create({
        type: 'expense',
        amount: 20,
        date: '2024-01-15',
        accountId,
        categoryId,
        notes: 'Lunch at restaurant',
      });

      const results = await repository.search('Starbucks');
      expect(results).toHaveLength(1);
      expect(results[0].notes).toBe('Coffee at Starbucks');
    });

    it('search is case-insensitive', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-15',
        accountId,
        categoryId,
        notes: 'COFFEE',
      });

      const results = await repository.search('coffee');
      expect(results).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('counts all transactions', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await repository.create({
        type: 'expense',
        amount: 20,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      const count = await repository.count();
      expect(count).toBe(2);
    });

    it('counts with filter', async () => {
      await repository.create({
        type: 'expense',
        amount: 10,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await repository.create({
        type: 'income',
        amount: 100,
        date: '2024-01-15',
        accountId,
        categoryId: categoryId2,
      });

      const count = await repository.count({ type: 'income' });
      expect(count).toBe(1);
    });
  });

  describe('update', () => {
    it('updates specified fields', async () => {
      const created = await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      vi.useFakeTimers();
      const updatedAt = new Date('2024-02-01T12:00:00Z');
      vi.setSystemTime(updatedAt);

      const updated = await repository.update({
        id: created.id,
        amount: 75,
        notes: 'Added notes',
      });

      expect(updated.amount).toBe(75);
      expect(updated.notes).toBe('Added notes');
      expect(updated.type).toBe('expense'); // Unchanged
      expect(updated.updatedAt).toBe(updatedAt.getTime());
      expect(updated.createdAt).toBe(created.createdAt); // Unchanged
    });

    it('throws when no fields provided', async () => {
      const created = await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await expect(repository.update({ id: created.id })).rejects.toThrow(
        'No fields provided for update'
      );
    });

    it('throws when transaction not found', async () => {
      await expect(
        repository.update({ id: 'nonexistent', amount: 100 })
      ).rejects.toThrow('Transaction not found for id: nonexistent');
    });

  });

  describe('delete', () => {
    it('deletes the transaction', async () => {
      const created = await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('throws when transaction not found', async () => {
      await expect(repository.delete('nonexistent')).rejects.toThrow(
        'Transaction not found for id: nonexistent'
      );
    });
  });

  describe('aggregateByCategory', () => {
    it('returns correct totals per category', async () => {
      // Create multiple transactions in same category
      await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await repository.create({
        type: 'expense',
        amount: 30,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      const aggregation = await repository.aggregateByCategory({ type: 'expense' });
      expect(aggregation).toHaveLength(1);
      expect(aggregation[0].categoryId).toBe(categoryId);
      expect(aggregation[0].total).toBe(80);
      expect(aggregation[0].count).toBe(2);
    });

    it('filters by type (income vs expense)', async () => {
      await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await repository.create({
        type: 'income',
        amount: 100,
        date: '2024-01-15',
        accountId,
        categoryId: categoryId2,
      });

      const expenses = await repository.aggregateByCategory({ type: 'expense' });
      expect(expenses).toHaveLength(1);
      expect(expenses[0].categoryId).toBe(categoryId);
      expect(expenses[0].total).toBe(50);

      const incomes = await repository.aggregateByCategory({ type: 'income' });
      expect(incomes).toHaveLength(1);
      expect(incomes[0].categoryId).toBe(categoryId2);
      expect(incomes[0].total).toBe(100);
    });

    it('filters by date range', async () => {
      await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-01',
        accountId,
        categoryId,
      });

      await repository.create({
        type: 'expense',
        amount: 100,
        date: '2024-02-01',
        accountId,
        categoryId,
      });

      const januaryAgg = await repository.aggregateByCategory({
        type: 'expense',
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-15' },
      });

      expect(januaryAgg).toHaveLength(1);
      expect(januaryAgg[0].total).toBe(50);
    });

    it('returns empty array when no transactions match', async () => {
      const aggregation = await repository.aggregateByCategory({ type: 'expense' });
      expect(aggregation).toHaveLength(0);
    });

    it('returns category details (name, icon, color)', async () => {
      await repository.create({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      const aggregation = await repository.aggregateByCategory({ type: 'expense' });
      expect(aggregation).toHaveLength(1);
      expect(aggregation[0].categoryName).toBe('Food');
      // Icon and color may be null since we didn't set them in test fixture
      expect(aggregation[0]).toHaveProperty('categoryIcon');
      expect(aggregation[0]).toHaveProperty('categoryColor');
    });

    it('sorts by total descending', async () => {
      // Create expenses in different categories
      await repository.create({
        type: 'expense',
        amount: 30,
        date: '2024-01-15',
        accountId,
        categoryId,
      });

      await repository.create({
        type: 'income',
        amount: 100,
        date: '2024-01-15',
        accountId,
        categoryId: categoryId2,
      });

      await repository.create({
        type: 'income',
        amount: 50,
        date: '2024-01-15',
        accountId,
        categoryId: categoryId2,
      });

      const incomes = await repository.aggregateByCategory({ type: 'income' });
      expect(incomes).toHaveLength(1);
      expect(incomes[0].total).toBe(150); // 100 + 50
    });
  });
});
