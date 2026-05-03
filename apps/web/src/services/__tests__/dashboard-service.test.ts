/**
 * Tests for DashboardService
 *
 * Verifies category breakdowns, summaries, date filtering, and currency conversion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardService } from '../dashboard-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import type { DashboardFilter } from '@cashmgr/core';

describe('DashboardService', () => {
  let service: DashboardService;
  let adapter: MockDatabaseAdapter;

  beforeEach(() => {
    adapter = new MockDatabaseAdapter();
    service = new DashboardService(adapter);
  });

  describe('getCategoryBreakdown', () => {
    it('should return empty array when no transactions exist', async () => {
      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const breakdown = await service.getCategoryBreakdown(filter);
      expect(breakdown).toEqual([]);
    });

    it('should aggregate transactions by category with percentages', async () => {
      // Setup accounts and categories
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const food = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const transport = await adapter.createCategory({
        name: 'Transport',
        type: 'expense',
      });

      // Create transactions
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: food.id,
        currency: 'USD',
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: transport.id,
        currency: 'USD',
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-25',
        accountId: account.id,
        categoryId: food.id,
      });

      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0, // January (0-indexed)
        year: 2024,
      };

      const breakdown = await service.getCategoryBreakdown(filter);

      // Food: 150 / 200 = 75%
      // Transport: 50 / 200 = 25%
      expect(breakdown).toHaveLength(2);

      const foodAgg = breakdown.find(b => b.categoryId === food.id);
      expect(foodAgg?.total).toBe(150);
      expect(foodAgg?.percentage).toBe(75);

      const transportAgg = breakdown.find(b => b.categoryId === transport.id);
      expect(transportAgg?.total).toBe(50);
      expect(transportAgg?.percentage).toBe(25);
    });

    it('should filter by transaction type', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const expense = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const income = await adapter.createCategory({
        name: 'Salary',
        type: 'income',
      });

      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: expense.id,
      });
      await adapter.createTransaction({
        type: 'income',
        amount: 500,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: income.id,
      });

      const expenseFilter: DashboardFilter = {
        type: 'expense',
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const expenseBreakdown = await service.getCategoryBreakdown(expenseFilter);
      expect(expenseBreakdown).toHaveLength(1);
      expect(expenseBreakdown[0].categoryId).toBe(expense.id);

      const incomeFilter: DashboardFilter = {
        type: 'income',
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const incomeBreakdown = await service.getCategoryBreakdown(incomeFilter);
      expect(incomeBreakdown).toHaveLength(1);
      expect(incomeBreakdown[0].categoryId).toBe(income.id);
    });
  });

  describe('getSummary', () => {
    it('should return zero summary when no transactions exist', async () => {
      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const summary = await service.getSummary(filter);

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.netBalance).toBe(0);
    });

    it('should calculate income, expenses, and net balance', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const expenseCategory = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const incomeCategory = await adapter.createCategory({
        name: 'Salary',
        type: 'income',
      });

      // Income: 500 + 200 = 700
      await adapter.createTransaction({
        type: 'income',
        amount: 500,
        date: '2024-01-10',
        accountId: account.id,
        categoryId: incomeCategory.id,
      });
      await adapter.createTransaction({
        type: 'income',
        amount: 200,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: incomeCategory.id,
      });

      // Expenses: 100 + 50 = 150
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: expenseCategory.id,
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-25',
        accountId: account.id,
        categoryId: expenseCategory.id,
      });

      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0, // January
        year: 2024,
      };

      const summary = await service.getSummary(filter);

      expect(summary.totalIncome).toBe(700);
      expect(summary.totalExpenses).toBe(150);
      expect(summary.netBalance).toBe(550); // 700 - 150
    });

    it('should filter by date range', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // January transactions
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      // February transactions
      await adapter.createTransaction({
        type: 'expense',
        amount: 200,
        date: '2024-02-15',
        accountId: account.id,
        categoryId: category.id,
      });

      // Filter for January only
      const januaryFilter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0, // January
        year: 2024,
      };

      const januarySummary = await service.getSummary(januaryFilter);
      expect(januarySummary.totalExpenses).toBe(100);

      // Filter for February only
      const februaryFilter: DashboardFilter = {
        periodMode: 'monthly',
        month: 1, // February
        year: 2024,
      };

      const februarySummary = await service.getSummary(februaryFilter);
      expect(februarySummary.totalExpenses).toBe(200);
    });

    it('should support yearly filtering', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // 2024 transactions
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 200,
        date: '2024-06-15',
        accountId: account.id,
        categoryId: category.id,
      });

      // 2025 transactions
      await adapter.createTransaction({
        type: 'expense',
        amount: 300,
        date: '2025-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      const filter2024: DashboardFilter = {
        periodMode: 'yearly',
        year: 2024,
      };

      const summary2024 = await service.getSummary(filter2024);
      expect(summary2024.totalExpenses).toBe(300);

      const filter2025: DashboardFilter = {
        periodMode: 'yearly',
        year: 2025,
      };

      const summary2025 = await service.getSummary(filter2025);
      expect(summary2025.totalExpenses).toBe(300);
    });

    it('should support custom date range', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-10',
        accountId: account.id,
        categoryId: category.id,
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 200,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: category.id,
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 300,
        date: '2024-01-30',
        accountId: account.id,
        categoryId: category.id,
      });

      const customFilter: DashboardFilter = {
        periodMode: 'custom',
        startDate: '2024-01-15',
        endDate: '2024-01-25',
        year: 2024,
      };

      const summary = await service.getSummary(customFilter);
      expect(summary.totalExpenses).toBe(200); // Only the middle transaction
    });
  });

  describe('getTotalBalance', () => {
    it('should return zero when no currencies exist', async () => {
      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const result = await service.getTotalBalance(filter);

      expect(result.totalBalance).toBe(0);
      expect(result.primaryCurrency).toBeNull();
      expect(result.isConverted).toBe(false);
      expect(result.formattedBalance).toBe('$0.00');
    });

    it('should calculate net balance in primary currency', async () => {
      // Setup primary currency
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const expenseCategory = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const incomeCategory = await adapter.createCategory({
        name: 'Salary',
        type: 'income',
      });

      // Income: 500
      await adapter.createTransaction({
        type: 'income',
        amount: 500,
        date: '2024-01-10',
        accountId: account.id,
        categoryId: incomeCategory.id,
      });

      // Expenses: 150
      await adapter.createTransaction({
        type: 'expense',
        amount: 150,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: expenseCategory.id,
      });

      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const result = await service.getTotalBalance(filter);

      expect(result.totalBalance).toBe(350); // 500 - 150
      expect(result.primaryCurrency?.id).toBe('USD');
      expect(result.isConverted).toBe(false);
    });

    it('should convert amounts to primary currency when needed', async () => {
      // Setup currencies
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });
      await adapter.createCurrency({
        id: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.92, // 1 USD = 0.92 EUR
        isPrimary: false,
      });

      // USD account
      const usdAccount = await adapter.createAccount({
        name: 'USD Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });

      // EUR account
      const eurAccount = await adapter.createAccount({
        name: 'EUR Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'EUR',
      });

      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // USD expense: 100 USD
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-10',
        accountId: usdAccount.id,
        categoryId: category.id,
      });

      // EUR expense: 92 EUR = 100 USD (92 / 0.92)
      await adapter.createTransaction({
        type: 'expense',
        amount: 92,
        date: '2024-01-20',
        accountId: eurAccount.id,
        categoryId: category.id,
      });

      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const result = await service.getTotalBalance(filter);

      // Total expenses in USD: 100 + 100 = 200
      // No income, so net = -200
      expect(result.totalBalance).toBe(-200);
      expect(result.isConverted).toBe(true); // EUR was converted
    });

    it('should exclude transfers from net balance', async () => {
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const account1 = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const account2 = await adapter.createAccount({
        name: 'Bank',
        type: 'bank',
        initialBalance: 500,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // Income: 500
      await adapter.createTransaction({
        type: 'income',
        amount: 500,
        date: '2024-01-10',
        accountId: account1.id,
        categoryId: category.id,
      });

      // Transfer: Should not affect net balance
      await adapter.createTransaction({
        type: 'transfer',
        amount: 200,
        date: '2024-01-15',
        accountId: account1.id,
        toAccountId: account2.id,
      });

      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      const result = await service.getTotalBalance(filter);

      expect(result.totalBalance).toBe(500); // Only income counted, transfer excluded
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete dashboard workflow', async () => {
      // Setup
      await adapter.createCurrency({
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1.0,
        isPrimary: true,
      });

      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });

      const food = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const transport = await adapter.createCategory({
        name: 'Transport',
        type: 'expense',
      });
      const salary = await adapter.createCategory({
        name: 'Salary',
        type: 'income',
      });

      // Transactions
      await adapter.createTransaction({
        type: 'income',
        amount: 1000,
        date: '2024-01-05',
        accountId: account.id,
        categoryId: salary.id,
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 100,
        date: '2024-01-10',
        accountId: account.id,
        categoryId: food.id,
      });
      await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: transport.id,
      });

      const filter: DashboardFilter = {
        periodMode: 'monthly',
        month: 0,
        year: 2024,
      };

      // Get category breakdown
      const breakdown = await service.getCategoryBreakdown({
        ...filter,
        type: 'expense',
      });
      expect(breakdown).toHaveLength(2);

      // Get summary
      const summary = await service.getSummary(filter);
      expect(summary.totalIncome).toBe(1000);
      expect(summary.totalExpenses).toBe(150);
      expect(summary.netBalance).toBe(850);

      // Get total balance
      const balance = await service.getTotalBalance(filter);
      expect(balance.totalBalance).toBe(850);
      expect(balance.primaryCurrency?.id).toBe('USD');
    });
  });
});
