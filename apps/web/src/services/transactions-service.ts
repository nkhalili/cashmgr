import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  DatabaseAdapter,
  FilterParams,
  PaginationParams,
} from '@cashmgr/core';
import {
  CreateTransactionInputSchema,
  UpdateTransactionInputSchema,
  ErrorHandler,
  NotFoundError,
  ValidationError,
  validateTransactionBusinessRules,
} from '@cashmgr/core';

/**
 * F-002: TransactionsService
 * Manages transactions with auto-balance updates
 *
 * Features:
 * - CRUD operations for transactions
 * - Auto-updates account balances on create/update/delete
 * - Validates inputs with Zod schemas
 * - Support for income, expense, and transfer types
 */
export class TransactionsService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  /**
   * Get all transactions with optional filtering and pagination
   */
  async listTransactions(
    filter?: FilterParams,
    pagination?: PaginationParams,
  ): Promise<Transaction[]> {
    try {
      return await this.adapter.getTransactions(filter, pagination);
    } catch (error) {
      throw ErrorHandler.handle(error, 'TransactionsService.listTransactions');
    }
  }

  /**
   * Get a transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction> {
    try {
      const transaction = await this.adapter.getTransactionById(id);
      if (!transaction) {
        throw new NotFoundError('Transaction', id);
      }
      return transaction;
    } catch (error) {
      throw ErrorHandler.handle(error, 'TransactionsService.getTransactionById');
    }
  }

  /**
   * Create a new transaction and update account balances
   */
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    try {
      // Validate input schema
      const validated = CreateTransactionInputSchema.parse(input);

      // Validate business rules
      validateTransactionBusinessRules(validated);

      // Verify account exists
      const account = await this.adapter.getAccountById(validated.accountId);
      if (!account) {
        throw new NotFoundError('Account', validated.accountId);
      }

      // Verify category exists (only for income/expense, not transfers)
      if (validated.categoryId) {
        const category = await this.adapter.getCategoryById(validated.categoryId);
        if (!category) {
          throw new NotFoundError('Category', validated.categoryId);
        }
      }

      // For transfers, verify destination account exists
      let toAccount = null;
      if (validated.type === 'transfer' && validated.toAccountId) {
        toAccount = await this.adapter.getAccountById(validated.toAccountId);
        if (!toAccount) {
          throw new NotFoundError('Destination account', validated.toAccountId);
        }
      }

      // Create the transaction
      const transaction = await this.adapter.createTransaction(validated);

      // Update account balances
      await this.applyBalanceChange(
        validated.type,
        validated.amount,
        validated.accountId,
        validated.toAccountId,
      );

      return transaction;
    } catch (error) {
      // Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'TransactionsService.createTransaction');
    }
  }

  /**
   * Update an existing transaction and adjust account balances
   */
  async updateTransaction(
    id: string,
    updates: Partial<Omit<UpdateTransactionInput, 'id'>>,
  ): Promise<Transaction> {
    try {
      // Get current transaction
      const current = await this.adapter.getTransactionById(id);
      if (!current) {
        throw new NotFoundError('Transaction', id);
      }

      // Build update input
      const updateInput: UpdateTransactionInput = { id, ...updates };

      // Validate with schema
      const validated = UpdateTransactionInputSchema.parse(updateInput);

      // Determine the final values after update
      const finalType = validated.type ?? current.type;
      const finalAmount = validated.amount ?? current.amount;
      const finalAccountId = validated.accountId ?? current.accountId;
      const finalToAccountId = validated.toAccountId !== undefined
        ? validated.toAccountId
        : current.toAccountId;

      // Validate business rules with final values
      validateTransactionBusinessRules({
        type: finalType,
        accountId: finalAccountId,
        toAccountId: finalToAccountId,
      });

      // Verify new account if changed
      if (validated.accountId && validated.accountId !== current.accountId) {
        const account = await this.adapter.getAccountById(validated.accountId);
        if (!account) {
          throw new NotFoundError('Account', validated.accountId);
        }
      }

      // Verify new category if changed
      if (validated.categoryId && validated.categoryId !== current.categoryId) {
        const category = await this.adapter.getCategoryById(validated.categoryId);
        if (!category) {
          throw new NotFoundError('Category', validated.categoryId);
        }
      }

      // Verify new destination account if changed
      if (
        finalType === 'transfer' &&
        finalToAccountId &&
        finalToAccountId !== current.toAccountId
      ) {
        const toAccount = await this.adapter.getAccountById(finalToAccountId);
        if (!toAccount) {
          throw new NotFoundError('Destination account', finalToAccountId);
        }
      }

      // Reverse old transaction's balance effect
      await this.reverseBalanceChange(
        current.type,
        current.amount,
        current.accountId,
        current.toAccountId,
      );

      // Apply new transaction's balance effect
      await this.applyBalanceChange(
        finalType,
        finalAmount,
        finalAccountId,
        finalToAccountId,
      );

      // Update the transaction
      const updated = await this.adapter.updateTransaction(validated);
      return updated;
    } catch (error) {
      // Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'TransactionsService.updateTransaction');
    }
  }

  /**
   * Delete a transaction and reverse its balance effect
   */
  async deleteTransaction(id: string): Promise<void> {
    try {
      // Get current transaction
      const transaction = await this.adapter.getTransactionById(id);
      if (!transaction) {
        throw new NotFoundError('Transaction', id);
      }

      // Reverse balance effect
      await this.reverseBalanceChange(
        transaction.type,
        transaction.amount,
        transaction.accountId,
        transaction.toAccountId,
      );

      // Delete the transaction
      await this.adapter.deleteTransaction(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'TransactionsService.deleteTransaction');
    }
  }

  /**
   * Apply balance change based on transaction type
   * Income: +amount to account
   * Expense: -amount from account
   * Transfer: -amount from source, +amount to destination
   */
  private async applyBalanceChange(
    type: string,
    amount: number,
    accountId: string,
    toAccountId?: string | null,
  ): Promise<void> {
    const account = await this.adapter.getAccountById(accountId);
    if (!account) return;

    if (type === 'income') {
      await this.adapter.updateAccount({
        id: accountId,
        balance: account.balance + amount,
      });
    } else if (type === 'expense') {
      await this.adapter.updateAccount({
        id: accountId,
        balance: account.balance - amount,
      });
    } else if (type === 'transfer' && toAccountId) {
      // Subtract from source
      await this.adapter.updateAccount({
        id: accountId,
        balance: account.balance - amount,
      });

      // Add to destination
      const toAccount = await this.adapter.getAccountById(toAccountId);
      if (toAccount) {
        await this.adapter.updateAccount({
          id: toAccountId,
          balance: toAccount.balance + amount,
        });
      }
    }
  }

  /**
   * Reverse balance change (for updates and deletes)
   * This does the opposite of applyBalanceChange
   */
  private async reverseBalanceChange(
    type: string,
    amount: number,
    accountId: string,
    toAccountId?: string,
  ): Promise<void> {
    const account = await this.adapter.getAccountById(accountId);
    if (!account) return;

    if (type === 'income') {
      // Reverse income: subtract
      await this.adapter.updateAccount({
        id: accountId,
        balance: account.balance - amount,
      });
    } else if (type === 'expense') {
      // Reverse expense: add back
      await this.adapter.updateAccount({
        id: accountId,
        balance: account.balance + amount,
      });
    } else if (type === 'transfer' && toAccountId) {
      // Reverse transfer: add back to source
      await this.adapter.updateAccount({
        id: accountId,
        balance: account.balance + amount,
      });

      // Reverse transfer: subtract from destination
      const toAccount = await this.adapter.getAccountById(toAccountId);
      if (toAccount) {
        await this.adapter.updateAccount({
          id: toAccountId,
          balance: toAccount.balance - amount,
        });
      }
    }
  }
}
