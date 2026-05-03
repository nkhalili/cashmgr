/**
 * Tests for TransactionsService
 *
 * Verifies CRUD operations, balance updates, validation, and transfer logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionsService } from '../transactions-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import { NotFoundError } from '@cashmgr/core';
import type { CreateTransactionInput } from '@cashmgr/core';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let adapter: MockDatabaseAdapter;

  beforeEach(() => {
    adapter = new MockDatabaseAdapter();
    service = new TransactionsService(adapter);
  });

  describe('listTransactions', () => {
    it('should return empty array when no transactions exist', async () => {
      const transactions = await service.listTransactions();
      expect(transactions).toEqual([]);
    });

    it('should return all transactions', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });
      await adapter.createTransaction({
        type: 'income',
        amount: 100,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: category.id,
      });

      const transactions = await service.listTransactions();
      expect(transactions).toHaveLength(2);
    });

    it('should filter transactions by type', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });
      await adapter.createTransaction({
        type: 'income',
        amount: 100,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: category.id,
      });

      const expenseTransactions = await service.listTransactions({ type: 'expense' });
      expect(expenseTransactions).toHaveLength(1);
      expect(expenseTransactions[0].type).toBe('expense');
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction when found', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const created = await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      const transaction = await service.getTransactionById(created.id);
      expect(transaction.id).toBe(created.id);
      expect(transaction.amount).toBe(50);
    });

    it('should throw NotFoundError when transaction does not exist', async () => {
      await expect(service.getTransactionById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createTransaction', () => {
    it('should create income transaction and increase account balance', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Salary',
        type: 'income',
      });

      const input: CreateTransactionInput = {
        type: 'income',
        amount: 500,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      };

      const transaction = await service.createTransaction(input);

      expect(transaction.type).toBe('income');
      expect(transaction.amount).toBe(500);

      // Verify balance increased
      const updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(600); // 100 + 500
    });

    it('should create expense transaction and decrease account balance', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      const input: CreateTransactionInput = {
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      };

      const transaction = await service.createTransaction(input);

      expect(transaction.type).toBe('expense');
      expect(transaction.amount).toBe(50);

      // Verify balance decreased
      const updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(50); // 100 - 50
    });

    it('should create transfer transaction and update both account balances', async () => {
      const sourceAccount = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const destAccount = await adapter.createAccount({
        name: 'Bank',
        type: 'bank',
        initialBalance: 200,
        currency: 'USD',
      });

      const input: CreateTransactionInput = {
        type: 'transfer',
        amount: 50,
        date: '2024-01-15',
        accountId: sourceAccount.id,
        toAccountId: destAccount.id,
      };

      const transaction = await service.createTransaction(input);

      expect(transaction.type).toBe('transfer');
      expect(transaction.amount).toBe(50);
      expect(transaction.toAccountId).toBe(destAccount.id);

      // Verify source balance decreased
      const updatedSource = await adapter.getAccountById(sourceAccount.id);
      expect(updatedSource?.balance).toBe(50); // 100 - 50

      // Verify destination balance increased
      const updatedDest = await adapter.getAccountById(destAccount.id);
      expect(updatedDest?.balance).toBe(250); // 200 + 50
    });

    it('should throw NotFoundError when account does not exist', async () => {
      const input: CreateTransactionInput = {
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: 'non-existent-account',
        categoryId: 'some-category',
      };

      await expect(service.createTransaction(input)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });

      const input: CreateTransactionInput = {
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: 'non-existent-category',
      };

      await expect(service.createTransaction(input)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when destination account does not exist', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });

      const input: CreateTransactionInput = {
        type: 'transfer',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        toAccountId: 'non-existent-account',
      };

      await expect(service.createTransaction(input)).rejects.toThrow(NotFoundError);
    });

    it('should reject negative amount', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      const input: CreateTransactionInput = {
        type: 'expense',
        amount: -50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      };

      await expect(service.createTransaction(input)).rejects.toThrow();
    });

    it('should reject transfer without toAccountId', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });

      const input: CreateTransactionInput = {
        type: 'transfer',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        toAccountId: undefined,
      };

      await expect(service.createTransaction(input)).rejects.toThrow();
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction amount and adjust balance correctly', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // Create transaction: 100 - 50 = 50
      const created = await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      // Manually apply balance change (since adapter doesn't do it)
      await adapter.updateAccount({
        id: account.id,
        balance: 50,
      });

      // Update transaction to 75: should reverse 50, apply 75
      // Result: 50 + 50 - 75 = 25
      const updated = await service.updateTransaction(created.id, { amount: 75 });

      expect(updated.amount).toBe(75);

      const updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(25); // 50 (current) + 50 (reverse) - 75 (new)
    });

    it('should update transaction type and adjust balances correctly', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // Create expense: 100 - 50 = 50
      const created = await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      await adapter.updateAccount({
        id: account.id,
        balance: 50,
      });

      // Change to income: should reverse expense (add 50), apply income (add 50)
      // Result: 50 + 50 + 50 = 150
      const updated = await service.updateTransaction(created.id, { type: 'income' });

      expect(updated.type).toBe('income');

      const updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(150);
    });

    it('should update transaction account and adjust balances correctly', async () => {
      const account1 = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const account2 = await adapter.createAccount({
        name: 'Bank',
        type: 'bank',
        initialBalance: 200,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // Create expense on account1: 100 - 50 = 50
      const created = await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account1.id,
        categoryId: category.id,
      });

      await adapter.updateAccount({
        id: account1.id,
        balance: 50,
      });

      // Move to account2: reverse from account1 (add 50), apply to account2 (subtract 50)
      const updated = await service.updateTransaction(created.id, {
        accountId: account2.id,
      });

      expect(updated.accountId).toBe(account2.id);

      const updatedAccount1 = await adapter.getAccountById(account1.id);
      expect(updatedAccount1?.balance).toBe(100); // 50 + 50 (reversed)

      const updatedAccount2 = await adapter.getAccountById(account2.id);
      expect(updatedAccount2?.balance).toBe(150); // 200 - 50 (applied)
    });

    it('should throw NotFoundError for non-existent transaction', async () => {
      await expect(
        service.updateTransaction('non-existent-id', { amount: 100 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when new account does not exist', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const transaction = await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      await expect(
        service.updateTransaction(transaction.id, { accountId: 'non-existent-account' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction and reverse balance effect', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });

      // Create expense: 100 - 50 = 50
      const created = await adapter.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      await adapter.updateAccount({
        id: account.id,
        balance: 50,
      });

      // Delete should reverse: 50 + 50 = 100
      await service.deleteTransaction(created.id);

      const deletedTransaction = await adapter.getTransactionById(created.id);
      expect(deletedTransaction).toBeNull();

      const updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(100); // Back to original
    });

    it('should delete income transaction and reverse balance effect', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const category = await adapter.createCategory({
        name: 'Salary',
        type: 'income',
      });

      // Create income: 100 + 500 = 600
      const created = await adapter.createTransaction({
        type: 'income',
        amount: 500,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      await adapter.updateAccount({
        id: account.id,
        balance: 600,
      });

      // Delete should reverse: 600 - 500 = 100
      await service.deleteTransaction(created.id);

      const updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(100);
    });

    it('should delete transfer and reverse both account balances', async () => {
      const sourceAccount = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      const destAccount = await adapter.createAccount({
        name: 'Bank',
        type: 'bank',
        initialBalance: 200,
        currency: 'USD',
      });

      // Create transfer: source 100 - 50 = 50, dest 200 + 50 = 250
      const created = await adapter.createTransaction({
        type: 'transfer',
        amount: 50,
        date: '2024-01-15',
        accountId: sourceAccount.id,
        toAccountId: destAccount.id,
      });

      await adapter.updateAccount({
        id: sourceAccount.id,
        balance: 50,
      });
      await adapter.updateAccount({
        id: destAccount.id,
        balance: 250,
      });

      // Delete should reverse: source 50 + 50 = 100, dest 250 - 50 = 200
      await service.deleteTransaction(created.id);

      const updatedSource = await adapter.getAccountById(sourceAccount.id);
      expect(updatedSource?.balance).toBe(100);

      const updatedDest = await adapter.getAccountById(destAccount.id);
      expect(updatedDest?.balance).toBe(200);
    });

    it('should throw NotFoundError for non-existent transaction', async () => {
      await expect(service.deleteTransaction('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full transaction lifecycle with balance updates', async () => {
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

      // Create: 1000 - 50 = 950
      const created = await service.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category.id,
      });

      let updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(950);

      // Update: reverse 50, apply 75: 950 + 50 - 75 = 925
      await service.updateTransaction(created.id, { amount: 75 });

      updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(925);

      // Delete: reverse 75: 925 + 75 = 1000
      await service.deleteTransaction(created.id);

      updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(1000); // Back to original
    });

    it('should handle multiple transactions independently', async () => {
      const account = await adapter.createAccount({
        name: 'Cash',
        type: 'cash',
        initialBalance: 1000,
        currency: 'USD',
      });
      const category1 = await adapter.createCategory({
        name: 'Food',
        type: 'expense',
      });
      const category2 = await adapter.createCategory({
        name: 'Salary',
        type: 'income',
      });

      // Expense: 1000 - 50 = 950
      await service.createTransaction({
        type: 'expense',
        amount: 50,
        date: '2024-01-15',
        accountId: account.id,
        categoryId: category1.id,
      });

      // Income: 950 + 500 = 1450
      await service.createTransaction({
        type: 'income',
        amount: 500,
        date: '2024-01-20',
        accountId: account.id,
        categoryId: category2.id,
      });

      const updatedAccount = await adapter.getAccountById(account.id);
      expect(updatedAccount?.balance).toBe(1450);

      const transactions = await service.listTransactions();
      expect(transactions).toHaveLength(2);
    });
  });
});
