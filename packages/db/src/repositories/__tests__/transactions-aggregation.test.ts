import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { TransactionsAggregation } from '../transactions-aggregation';
import {
  createTestDatabase,
  insertTestAccount,
  insertTestCategory,
  InMemorySqliteDatabase,
} from './test-utils';

describe('TransactionsAggregation', () => {
  let aggregation: TransactionsAggregation;
  let db: InMemorySqliteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    aggregation = new TransactionsAggregation(db);

    // Insert test accounts and categories
    await insertTestAccount(db, { id: 'acc-1', name: 'Cash' });
    await insertTestAccount(db, { id: 'acc-2', name: 'Bank' });
    await insertTestCategory(db, { id: 'cat-1', name: 'Food', type: 'expense' });
    await insertTestCategory(db, { id: 'cat-2', name: 'Transport', type: 'expense' });
    await insertTestCategory(db, { id: 'cat-income', name: 'Salary', type: 'income' });
  });

  afterEach(async () => {
    await db.close();
  });

  describe('aggregateByCategory', () => {
    it('should return empty array when no transactions', async () => {
      const result = await aggregation.aggregateByCategory({});

      expect(result).toEqual([]);
    });

    it('should aggregate transactions by category', async () => {
      const now = Date.now();

      // Create transactions using direct SQL (categories and accounts already created in beforeEach)
      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-1', 'expense', 50, 'USD', '2024-01-15', 'acc-1', 'cat-1', now, now],
      );

      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-2', 'expense', 30, 'USD', '2024-01-16', 'acc-1', 'cat-1', now, now],
      );

      const result = await aggregation.aggregateByCategory({});

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: 'Food',
        total: 80,
        count: 2,
      });
    });

    it('should filter by transaction type', async () => {
      const now = Date.now();

      // Create income transaction (cat-income already created in beforeEach)
      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-1', 'income', 5000, 'USD', '2024-01-01', 'acc-1', 'cat-income', now, now],
      );

      // Create expense transaction (cat-1 Food already created in beforeEach)
      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-2', 'expense', 50, 'USD', '2024-01-15', 'acc-1', 'cat-1', now, now],
      );

      const result = await aggregation.aggregateByCategory({ type: 'expense' });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: 'Food',
        total: 50,
      });
    });

    it('should filter by date range', async () => {
      const now = Date.now();

      // Create transactions with different dates (cat-1 and acc-1 already created in beforeEach)
      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-1', 'expense', 50, 'USD', '2024-01-15', 'acc-1', 'cat-1', now, now],
      );

      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-2', 'expense', 30, 'USD', '2024-02-10', 'acc-1', 'cat-1', now, now],
      );

      const result = await aggregation.aggregateByCategory({
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        total: 50,
        count: 1,
      });
    });

    it('should filter by account', async () => {
      const now = Date.now();

      // Create transactions for different accounts (acc-1, acc-2, cat-1 already created in beforeEach)
      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-1', 'expense', 50, 'USD', '2024-01-15', 'acc-1', 'cat-1', now, now],
      );

      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-2', 'expense', 100, 'USD', '2024-01-16', 'acc-2', 'cat-1', now, now],
      );

      const result = await aggregation.aggregateByCategory({ accountId: 'acc-1' });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        total: 50,
        count: 1,
      });
    });

    it('should return results ordered by total descending', async () => {
      const now = Date.now();

      // Create transactions (cat-1, cat-2, acc-1 already created in beforeEach)
      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-1', 'expense', 30, 'USD', '2024-01-15', 'acc-1', 'cat-1', now, now],
      );

      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['tx-2', 'expense', 100, 'USD', '2024-01-16', 'acc-1', 'cat-2', now, now],
      );

      const result = await aggregation.aggregateByCategory({});

      expect(result).toHaveLength(2);
      expect(result[0].categoryId).toBe('cat-2');
      expect(result[0].total).toBe(100);
      expect(result[1].categoryId).toBe('cat-1');
      expect(result[1].total).toBe(30);
    });
  });
});
