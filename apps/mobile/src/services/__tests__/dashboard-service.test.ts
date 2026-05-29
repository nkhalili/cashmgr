import { DashboardService } from '../dashboard-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import type { DashboardFilter } from '@cashmgr/core';

describe('DashboardService (mobile)', () => {
  let service: DashboardService;
  let adapter: MockDatabaseAdapter;

  beforeEach(() => {
    adapter = new MockDatabaseAdapter();
    service = new DashboardService(adapter);
  });

  // Regression test for the off-by-one month bug:
  // filter.month is 1-indexed (1=Jan … 12=Dec) on mobile, matching how the
  // dashboard initialises it via `now.getMonth() + 1`. An earlier version of
  // the service applied an extra +1, causing May (5) to query June (6) and
  // making transactions appear one month in the past.
  describe('monthly date range uses 1-indexed months', () => {
    let accountId: string;
    let categoryId: string;

    beforeEach(async () => {
      const account = await adapter.createAccount({ name: 'Cash', type: 'cash', initialBalance: 0, currency: 'USD' });
      const category = await adapter.createCategory({ name: 'Food', type: 'expense' });
      accountId = account.id;
      categoryId = category.id;
    });

    it('shows a May transaction when filtering with month=5', async () => {
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-05-15',
        accountId,
        categoryId,
      });

      const filter: DashboardFilter = { periodMode: 'monthly', month: 5, year: 2024 };
      const summary = await service.getSummary(filter);

      expect(summary.totalExpenses).toBe(100);
    });

    it('does not show a May transaction when filtering with month=4 (April)', async () => {
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-05-15',
        accountId,
        categoryId,
      });

      const filter: DashboardFilter = { periodMode: 'monthly', month: 4, year: 2024 };
      const summary = await service.getSummary(filter);

      expect(summary.totalExpenses).toBe(0);
    });

    it('does not show a May transaction when filtering with month=6 (June)', async () => {
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-05-15',
        accountId,
        categoryId,
      });

      const filter: DashboardFilter = { periodMode: 'monthly', month: 6, year: 2024 };
      const summary = await service.getSummary(filter);

      expect(summary.totalExpenses).toBe(0);
    });

    it('handles month boundaries correctly (last day of month included)', async () => {
      await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-31',
        accountId,
        categoryId,
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 75,
        date: '2024-02-01',
        accountId,
        categoryId,
      });

      const janFilter: DashboardFilter = { periodMode: 'monthly', month: 1, year: 2024 };
      const janSummary = await service.getSummary(janFilter);
      expect(janSummary.totalExpenses).toBe(50);

      const febFilter: DashboardFilter = { periodMode: 'monthly', month: 2, year: 2024 };
      const febSummary = await service.getSummary(febFilter);
      expect(febSummary.totalExpenses).toBe(75);
    });

    it('handles December (month=12) correctly', async () => {
      await adapter.createTransaction({
        type: 'income',
        amount: 200,
        date: '2024-12-25',
        accountId,
        categoryId,
      });

      const filter: DashboardFilter = { periodMode: 'monthly', month: 12, year: 2024 };
      const summary = await service.getSummary(filter);

      expect(summary.totalIncome).toBe(200);
    });
  });
});
