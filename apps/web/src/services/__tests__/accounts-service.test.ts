/**
 * Tests for AccountsService
 *
 * Verifies CRUD operations, validation, error handling, and business rules.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AccountsService } from '../accounts-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import { ValidationError, NotFoundError } from '@cashmgr/core';
import type { CreateAccountInput } from '@cashmgr/core';

describe('AccountsService', () => {
  let service: AccountsService;
  let adapter: MockDatabaseAdapter;

  beforeEach(() => {
    adapter = new MockDatabaseAdapter();
    service = new AccountsService(adapter);
  });

  describe('listAccounts', () => {
    it('should return empty array when no accounts exist', async () => {
      const accounts = await service.listAccounts();
      expect(accounts).toEqual([]);
    });

    it('should return all accounts', async () => {
      await adapter.createAccount({ name: 'Cash', type: 'cash', initialBalance: 100, currency: 'USD' });
      await adapter.createAccount({ name: 'Bank', type: 'bank', initialBalance: 500, currency: 'USD' });

      const accounts = await service.listAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts[0].name).toBe('Cash');
      expect(accounts[1].name).toBe('Bank');
    });
  });

  describe('createAccount', () => {
    it('should create account with valid input', async () => {
      const input: CreateAccountInput = {
        name: 'Checking',
        type: 'bank',
        initialBalance: 1000,
        currency: 'USD',
      };

      const account = await service.createAccount(input);

      expect(account.name).toBe('Checking');
      expect(account.type).toBe('bank');
      expect(account.initialBalance).toBe(1000);
      expect(account.balance).toBe(1000);
      expect(account.currency).toBe('USD');
      expect(account.id).toBeDefined();
      expect(account.createdAt).toBeDefined();
      expect(account.updatedAt).toBeDefined();
    });

    it('should create account with minimal input', async () => {
      const input: CreateAccountInput = {
        name: 'Cash',
        type: 'cash',
        initialBalance: 0,
      };

      const account = await service.createAccount(input);

      expect(account.name).toBe('Cash');
      expect(account.type).toBe('cash');
    });

    it('should reject empty account name', async () => {
      const input: CreateAccountInput = {
        name: '',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      };

      await expect(service.createAccount(input)).rejects.toThrow(ValidationError);
    });

    it('should trim whitespace from account name', async () => {
      const input: CreateAccountInput = {
        name: '  Test Account  ',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      };

      const account = await service.createAccount(input);
      expect(account.name).toBe('Test Account');
    });

    it('should reject invalid account type', async () => {
      const input = {
        name: 'Test',
        type: 'invalid-type',
        initialBalance: 0,
        currency: 'USD',
      } as unknown as CreateAccountInput;

      await expect(service.createAccount(input)).rejects.toThrow(ValidationError);
    });

    it('should reject negative initial balance for non-credit accounts', async () => {
      const input: CreateAccountInput = {
        name: 'Cash',
        type: 'cash',
        initialBalance: -100,
        currency: 'USD',
      };

      // Business rule: Only credit accounts can have negative initial balance
      await expect(service.createAccount(input)).rejects.toThrow('Only credit accounts');
    });

    it('should accept zero initial balance', async () => {
      const input: CreateAccountInput = {
        name: 'Empty Account',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      };

      const account = await service.createAccount(input);
      expect(account.initialBalance).toBe(0);
      expect(account.balance).toBe(0);
    });

    it('should trim account name', async () => {
      const input: CreateAccountInput = {
        name: '  Trimmed Name  ',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      };

      const account = await service.createAccount(input);
      expect(account.name).toBe('Trimmed Name');
    });
  });

  describe('updateAccount', () => {
    it('should update account name', async () => {
      const created = await adapter.createAccount({
        name: 'Old Name',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      const updated = await service.updateAccount(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe('cash');
      expect(updated.initialBalance).toBe(0);
    });

    it('should update account type', async () => {
      const created = await adapter.createAccount({
        name: 'Account',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      const updated = await service.updateAccount(created.id, { type: 'bank' });

      expect(updated.name).toBe('Account');
      expect(updated.type).toBe('bank');
    });

    it('should update account currency', async () => {
      const created = await adapter.createAccount({
        name: 'Account',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      const updated = await service.updateAccount(created.id, { currency: 'EUR' });

      expect(updated.currency).toBe('EUR');
    });

    it('should update multiple fields at once', async () => {
      const created = await adapter.createAccount({
        name: 'Old',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      const updated = await service.updateAccount(created.id, {
        name: 'New',
        type: 'bank',
        currency: 'GBP',
      });

      expect(updated.name).toBe('New');
      expect(updated.type).toBe('bank');
      expect(updated.currency).toBe('GBP');
    });

    it('should reject update with empty name', async () => {
      const created = await adapter.createAccount({
        name: 'Valid Name',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      await expect(service.updateAccount(created.id, { name: '' })).rejects.toThrow(ValidationError);
    });

    it('should reject update with invalid type', async () => {
      const created = await adapter.createAccount({
        name: 'Account',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      await expect(
        service.updateAccount(created.id, { type: 'invalid' as any })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent account', async () => {
      await expect(
        service.updateAccount('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should not update initialBalance', async () => {
      const created = await adapter.createAccount({
        name: 'Account',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });

      // Attempting to update initialBalance (should be ignored)
      const updated = await service.updateAccount(created.id, {
        name: 'Updated',
        initialBalance: 500,
      } as any);

      expect(updated.initialBalance).toBe(100); // Should remain unchanged
    });

    it('should trim updated account name', async () => {
      const created = await adapter.createAccount({
        name: 'Old',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      const updated = await service.updateAccount(created.id, { name: '  Trimmed  ' });
      expect(updated.name).toBe('Trimmed');
    });
  });

  describe('deleteAccount', () => {
    it('should delete existing account', async () => {
      const created = await adapter.createAccount({
        name: 'To Delete',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      await service.deleteAccount(created.id);

      const account = await adapter.getAccountById(created.id);
      expect(account).toBeNull();
    });

    it('should throw NotFoundError for non-existent account', async () => {
      await expect(service.deleteAccount('non-existent-id')).rejects.toThrow(NotFoundError);
    });

    it('should not affect other accounts', async () => {
      const account1 = await adapter.createAccount({
        name: 'Keep1',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });
      const account2 = await adapter.createAccount({
        name: 'Delete',
        type: 'bank',
        initialBalance: 0,
        currency: 'USD',
      });
      const account3 = await adapter.createAccount({
        name: 'Keep2',
        type: 'cash',
        initialBalance: 0,
        currency: 'USD',
      });

      await service.deleteAccount(account2.id);

      const remaining = await adapter.getAccounts();
      expect(remaining).toHaveLength(2);
      expect(remaining.map(a => a.id)).toEqual([account1.id, account3.id]);
    });
  });

  describe('createDefaultAccounts', () => {
    it('should create default accounts (Cash, Chequing, Savings)', async () => {
      const accounts = await service.createDefaultAccounts();

      expect(accounts).toHaveLength(3);
      expect(accounts[0].name).toBe('Cash');
      expect(accounts[0].type).toBe('cash');
      expect(accounts[1].name).toBe('Chequing');
      expect(accounts[1].type).toBe('bank');
      expect(accounts[2].name).toBe('Savings');
      expect(accounts[2].type).toBe('bank');

      accounts.forEach(account => {
        expect(account.initialBalance).toBe(0);
        expect(account.balance).toBe(0);
        expect(account.currency).toBeDefined();
      });
    });

    it('should persist all default accounts', async () => {
      await service.createDefaultAccounts();

      const stored = await adapter.getAccounts();
      expect(stored).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    it('should wrap adapter errors with ErrorHandler', async () => {
      // Force adapter to throw error
      const brokenAdapter = new MockDatabaseAdapter();
      brokenAdapter.getAccounts = async () => {
        throw new Error('Database connection failed');
      };

      const brokenService = new AccountsService(brokenAdapter);

      await expect(brokenService.listAccounts()).rejects.toThrow();
    });

    it('should convert Zod errors to ValidationError', async () => {
      const input = {
        name: '', // Invalid
        type: 'cash',
      } as CreateAccountInput;

      try {
        await service.createAccount(input);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('name');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle full account lifecycle', async () => {
      // Create
      const created = await service.createAccount({
        name: 'Lifecycle Test',
        type: 'cash',
        initialBalance: 100,
        currency: 'USD',
      });
      expect(created.id).toBeDefined();

      // List
      const accounts = await service.listAccounts();
      expect(accounts).toHaveLength(1);

      // Update
      const updated = await service.updateAccount(created.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');

      // Delete
      await service.deleteAccount(created.id);
      const final = await service.listAccounts();
      expect(final).toHaveLength(0);
    });

    it('should handle multiple accounts independently', async () => {
      const acc1 = await service.createAccount({ name: 'Account 1', type: 'cash', initialBalance: 0 });
      const acc2 = await service.createAccount({ name: 'Account 2', type: 'bank', initialBalance: 0 });
      const acc3 = await service.createAccount({ name: 'Account 3', type: 'credit', initialBalance: 0 });

      await service.updateAccount(acc2.id, { name: 'Updated 2' });

      const accounts = await service.listAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts.find(a => a.id === acc1.id)?.name).toBe('Account 1');
      expect(accounts.find(a => a.id === acc2.id)?.name).toBe('Updated 2');
      expect(accounts.find(a => a.id === acc3.id)?.name).toBe('Account 3');
    });
  });
});
