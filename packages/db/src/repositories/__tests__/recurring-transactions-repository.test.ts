import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { RecurringTransactionsRepository } from '../recurring-transactions-repository';
import { AccountsRepository } from '../accounts-repository';
import { CategoriesRepository } from '../categories-repository';
import { createTestDatabase, InMemorySqliteDatabase } from './test-utils';

describe('RecurringTransactionsRepository', () => {
  let db: InMemorySqliteDatabase;
  let repo: RecurringTransactionsRepository;
  let accountId: string;
  let categoryId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    repo = new RecurringTransactionsRepository(db);

    const accountsRepo = new AccountsRepository(db);
    const categoriesRepo = new CategoriesRepository(db);

    const account = await accountsRepo.create({ name: 'Wallet', type: 'cash', initialBalance: 0 });
    accountId = account.id;

    const category = await categoriesRepo.create({ name: 'Groceries', type: 'expense' });
    categoryId = category.id;
  });

  afterEach(async () => {
    await db.close();
  });

  it('creates and retrieves a recurring transaction', async () => {
    const rt = await repo.create({
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
    expect(rt.startDate).toBe('2026-01-01');
    expect(rt.isActive).toBe(true);
    expect(rt.lastGeneratedDate).toBeUndefined();
    expect(rt.endDate).toBeUndefined();
  });

  it('findAll returns all recurring transactions', async () => {
    await repo.create({ type: 'expense', amount: 50, accountId, categoryId, frequency: 'weekly', startDate: '2026-01-01' });
    await repo.create({ type: 'income', amount: 200, accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('findAll with activeOnly=true filters inactive', async () => {
    const rt = await repo.create({ type: 'expense', amount: 50, accountId, categoryId, frequency: 'weekly', startDate: '2026-01-01' });
    await repo.update({ id: rt.id, isActive: false });

    const activeOnly = await repo.findAll(true);
    expect(activeOnly).toHaveLength(0);

    const all = await repo.findAll(false);
    expect(all).toHaveLength(1);
  });

  it('updates fields and returns updated record', async () => {
    const rt = await repo.create({ type: 'expense', amount: 100, accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

    const updated = await repo.update({ id: rt.id, amount: 150, frequency: 'weekly', lastGeneratedDate: '2026-02-01' });

    expect(updated.amount).toBe(150);
    expect(updated.frequency).toBe('weekly');
    expect(updated.lastGeneratedDate).toBe('2026-02-01');
  });

  it('deletes a recurring transaction', async () => {
    const rt = await repo.create({ type: 'expense', amount: 100, accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01' });

    await repo.delete(rt.id);

    const found = await repo.findById(rt.id);
    expect(found).toBeNull();
  });

  it('sets and clears endDate', async () => {
    const rt = await repo.create({ type: 'expense', amount: 100, accountId, categoryId, frequency: 'monthly', startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(rt.endDate).toBe('2026-12-31');

    const cleared = await repo.update({ id: rt.id, endDate: null });
    expect(cleared.endDate).toBeUndefined();
  });
});
