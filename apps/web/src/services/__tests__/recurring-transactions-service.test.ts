import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecurringTransactionsService } from '../recurring-transactions-service';
import { TransactionsService } from '../transactions-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import { NotFoundError } from '@cashmgr/core';

// Fix "today" so date-dependent logic is deterministic
vi.mock('@cashmgr/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@cashmgr/core')>();
  return {
    ...original,
    getTodayDateString: () => '2026-06-10',
  };
});

describe('RecurringTransactionsService', () => {
  let adapter: MockDatabaseAdapter;
  let transactionsService: TransactionsService;
  let service: RecurringTransactionsService;
  let accountId: string;
  let categoryId: string;

  beforeEach(async () => {
    adapter = new MockDatabaseAdapter();
    transactionsService = new TransactionsService(adapter);
    service = new RecurringTransactionsService(adapter, transactionsService);

    const account = await adapter.createAccount({ name: 'Wallet', type: 'cash', initialBalance: 0 });
    accountId = account.id;
    const category = await adapter.createCategory({ name: 'Groceries', type: 'expense' });
    categoryId = category.id;
  });

  describe('createRecurringTransaction', () => {
    it('creates a recurring transaction and returns it', async () => {
      const rt = await service.createRecurringTransaction({
        type: 'expense',
        amount: 100,
        currency: 'USD',
        accountId,
        categoryId,
        frequency: 'monthly',
        startDate: '2026-01-01',
      });

      expect(rt.id).toBeTruthy();
      expect(rt.type).toBe('expense');
      expect(rt.amount).toBe(100);
      expect(rt.frequency).toBe('monthly');
      expect(rt.isActive).toBe(true);
    });

    it('throws ValidationError for missing required fields', async () => {
      await expect(
        service.createRecurringTransaction({
          type: 'expense',
          amount: -50,
          currency: 'USD',
          accountId,
          categoryId,
          frequency: 'monthly',
          startDate: '2026-01-01',
        })
      ).rejects.toThrow();
    });
  });

  describe('listRecurringTransactions', () => {
    it('returns all recurring transactions', async () => {
      await service.createRecurringTransaction({ type: 'expense', amount: 50, currency: 'USD', accountId, categoryId, frequency: 'weekly', startDate: '2026-01-01' });
      await service.createRecurringTransaction({ type: 'income', amount: 200, currency: 'USD', accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

      const list = await service.listRecurringTransactions();
      expect(list).toHaveLength(2);
    });

    it('filters inactive when activeOnly=true', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 50, currency: 'USD', accountId, categoryId, frequency: 'weekly', startDate: '2026-01-01' });
      await adapter.updateRecurringTransaction({ id: rt.id, isActive: false });

      const activeOnly = await service.listRecurringTransactions(true);
      expect(activeOnly).toHaveLength(0);

      const all = await service.listRecurringTransactions(false);
      expect(all).toHaveLength(1);
    });
  });

  describe('getRecurringTransactionById', () => {
    it('returns the recurring transaction by id', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 100, currency: 'USD', accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

      const found = await service.getRecurringTransactionById(rt.id);
      expect(found.id).toBe(rt.id);
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(service.getRecurringTransactionById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateRecurringTransaction', () => {
    it('updates fields and returns updated record', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 100, currency: 'USD', accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

      const updated = await service.updateRecurringTransaction(rt.id, { amount: 200, frequency: 'weekly' });
      expect(updated.amount).toBe(200);
      expect(updated.frequency).toBe('weekly');
    });

    it('deletes future-dated generated transactions on update', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 100, currency: 'USD', accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

      // Seed a future transaction linked to this recurring rule
      await adapter.createTransaction({ type: 'expense', amount: 100, currency: 'USD', date: '2026-07-01', accountId, categoryId, recurringTransactionId: rt.id });
      // Seed a past transaction (should NOT be deleted)
      await adapter.createTransaction({ type: 'expense', amount: 100, currency: 'USD', date: '2026-05-01', accountId, categoryId, recurringTransactionId: rt.id });

      await service.updateRecurringTransaction(rt.id, { amount: 150 });

      const remaining = await adapter.getTransactionsByRecurringId(rt.id);
      // Future one deleted, past one kept
      expect(remaining).toHaveLength(1);
      expect(remaining[0].date).toBe('2026-05-01');
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(service.updateRecurringTransaction('bad-id', { amount: 50 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteRecurringTransaction', () => {
    it('removes the recurring transaction', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 100, currency: 'USD', accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

      await service.deleteRecurringTransaction(rt.id);

      const list = await service.listRecurringTransactions();
      expect(list).toHaveLength(0);
    });

    it('deletes future generated transactions on delete', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 100, currency: 'USD', accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

      await adapter.createTransaction({ type: 'expense', amount: 100, currency: 'USD', date: '2026-07-01', accountId, categoryId, recurringTransactionId: rt.id });
      await adapter.createTransaction({ type: 'expense', amount: 100, currency: 'USD', date: '2026-05-01', accountId, categoryId, recurringTransactionId: rt.id });

      await service.deleteRecurringTransaction(rt.id);

      const txns = await adapter.getTransactions({});
      // Past transaction stays; future one deleted
      const futureRemaining = txns.filter((t) => t.recurringTransactionId === rt.id && t.date >= '2026-06-10');
      expect(futureRemaining).toHaveLength(0);
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(service.deleteRecurringTransaction('bad-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('generateDueTransactions', () => {
    it('creates transactions for each due occurrence', async () => {
      // daily from 2026-06-08, no lastGenerated → today is 2026-06-10, so 3 days due
      await service.createRecurringTransaction({ type: 'expense', amount: 10, currency: 'USD', accountId, categoryId, frequency: 'daily', startDate: '2026-06-08' });

      await service.generateDueTransactions();

      const txns = await adapter.getTransactions({});
      expect(txns).toHaveLength(3);
    });

    it('does not duplicate: skips dates already generated', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 10, currency: 'USD', accountId, categoryId, frequency: 'daily', startDate: '2026-06-08' });
      // Mark as already generated through 2026-06-09
      await adapter.updateRecurringTransaction({ id: rt.id, lastGeneratedDate: '2026-06-09' });

      await service.generateDueTransactions();

      const txns = await adapter.getTransactions({});
      expect(txns).toHaveLength(1); // only 2026-06-10
      expect(txns[0].date).toBe('2026-06-10');
    });

    it('updates lastGeneratedDate after generation', async () => {
      await service.createRecurringTransaction({ type: 'expense', amount: 10, currency: 'USD', accountId, categoryId, frequency: 'daily', startDate: '2026-06-08' });

      await service.generateDueTransactions();

      const [updated] = await adapter.getRecurringTransactions(true);
      expect(updated.lastGeneratedDate).toBe('2026-06-10');
    });

    it('skips inactive recurring transactions', async () => {
      const rt = await service.createRecurringTransaction({ type: 'expense', amount: 10, currency: 'USD', accountId, categoryId, frequency: 'daily', startDate: '2026-06-08' });
      await adapter.updateRecurringTransaction({ id: rt.id, isActive: false });

      await service.generateDueTransactions();

      const txns = await adapter.getTransactions({});
      expect(txns).toHaveLength(0);
    });

    it('respects endDate when generating', async () => {
      // daily from 2026-06-08 to 2026-06-09, today is 2026-06-10
      await service.createRecurringTransaction({ type: 'expense', amount: 10, currency: 'USD', accountId, categoryId, frequency: 'daily', startDate: '2026-06-08', endDate: '2026-06-09' });

      await service.generateDueTransactions();

      const txns = await adapter.getTransactions({});
      expect(txns).toHaveLength(2); // 2026-06-08 and 2026-06-09 only
    });
  });
});
