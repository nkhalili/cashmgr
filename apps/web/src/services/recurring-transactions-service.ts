import type {
  RecurringTransaction,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
  DatabaseAdapter,
} from '@cashmgr/core';
import {
  CreateRecurringTransactionInputSchema,
  UpdateRecurringTransactionInputSchema,
  ErrorHandler,
  NotFoundError,
  ValidationError,
  getDueOccurrences,
  getTodayDateString,
} from '@cashmgr/core';
import type { TransactionsService } from './transactions-service';

export class RecurringTransactionsService {
  constructor(
    private readonly adapter: DatabaseAdapter,
    private readonly transactionsService: TransactionsService,
  ) {}

  async createRecurringTransaction(
    input: CreateRecurringTransactionInput,
  ): Promise<RecurringTransaction> {
    try {
      const validated = CreateRecurringTransactionInputSchema.parse(input);
      return await this.adapter.createRecurringTransaction(validated);
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'RecurringTransactionsService.createRecurringTransaction');
    }
  }

  /**
   * Create a recurring template anchored to an existing transaction's date.
   * Backfills lastGeneratedDate to anchorDate so the generator doesn't create
   * a duplicate for that date; callers should follow up with generateDueTransactions()
   * to backfill any occurrences between anchorDate and today.
   */
  async createRecurringTransactionFromExisting(
    input: CreateRecurringTransactionInput,
    anchorDate: string,
  ): Promise<RecurringTransaction> {
    try {
      const validated = CreateRecurringTransactionInputSchema.parse(input);
      const created = await this.adapter.createRecurringTransaction(validated);
      return await this.adapter.updateRecurringTransaction({
        id: created.id,
        lastGeneratedDate: anchorDate,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'RecurringTransactionsService.createRecurringTransactionFromExisting');
    }
  }

  async listRecurringTransactions(activeOnly = false): Promise<RecurringTransaction[]> {
    try {
      return await this.adapter.getRecurringTransactions(activeOnly);
    } catch (error) {
      throw ErrorHandler.handle(error, 'RecurringTransactionsService.listRecurringTransactions');
    }
  }

  async getRecurringTransactionById(id: string): Promise<RecurringTransaction> {
    try {
      const rt = await this.adapter.getRecurringTransactionById(id);
      if (!rt) throw new NotFoundError('RecurringTransaction', id);
      return rt;
    } catch (error) {
      throw ErrorHandler.handle(error, 'RecurringTransactionsService.getRecurringTransactionById');
    }
  }

  /**
   * Update a recurring transaction template.
   * Deletes all generated transactions dated >= today so they regenerate with new values.
   */
  async updateRecurringTransaction(
    id: string,
    updates: Omit<UpdateRecurringTransactionInput, 'id'>,
  ): Promise<RecurringTransaction> {
    try {
      const current = await this.adapter.getRecurringTransactionById(id);
      if (!current) throw new NotFoundError('RecurringTransaction', id);

      const validated = UpdateRecurringTransactionInputSchema.parse({ id, ...updates });
      const today = getTodayDateString();

      // Delete only strictly future transactions; today's are already added and preserved
      const linkedTransactions = await this.adapter.getTransactionsByRecurringId(id);
      for (const tx of linkedTransactions) {
        if (tx.date > today) {
          await this.transactionsService.deleteTransaction(tx.id);
        }
      }

      // If already generated up to today, keep lastGeneratedDate at today to avoid
      // duplicating today's transaction on next startup. If never generated, use
      // yesterday so today gets generated on the next startup.
      const yesterday = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
      })();
      const newLastGeneratedDate = current.lastGeneratedDate != null ? today : yesterday;

      return await this.adapter.updateRecurringTransaction({
        ...validated,
        lastGeneratedDate: newLastGeneratedDate,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'RecurringTransactionsService.updateRecurringTransaction');
    }
  }

  /**
   * Deactivate a recurring transaction and delete all future generated transactions.
   */
  async deleteRecurringTransaction(id: string): Promise<void> {
    try {
      const current = await this.adapter.getRecurringTransactionById(id);
      if (!current) throw new NotFoundError('RecurringTransaction', id);

      const today = getTodayDateString();
      const futureTransactions = await this.adapter.getTransactionsByRecurringId(id);
      for (const tx of futureTransactions) {
        if (tx.date >= today) {
          await this.transactionsService.deleteTransaction(tx.id);
        }
      }

      await this.adapter.deleteRecurringTransaction(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'RecurringTransactionsService.deleteRecurringTransaction');
    }
  }

  /**
   * Generate all transactions that are due up to today for all active recurring templates.
   * Called on app startup to catch up on any missed occurrences.
   */
  async generateDueTransactions(): Promise<void> {
    try {
      const today = getTodayDateString();
      const activeTemplates = await this.adapter.getRecurringTransactions(true);

      for (const template of activeTemplates) {
        if (template.endDate && template.endDate < today && template.lastGeneratedDate && template.lastGeneratedDate >= template.endDate) {
          continue; // Fully exhausted
        }

        const dueDates = getDueOccurrences(
          template.frequency,
          template.startDate,
          template.lastGeneratedDate,
          template.endDate,
          today,
        );

        if (dueDates.length === 0) continue;

        for (const date of dueDates) {
          await this.transactionsService.createTransaction({
            type: template.type,
            amount: template.amount,
            currency: template.currency,
            date,
            accountId: template.accountId,
            categoryId: template.categoryId,
            toAccountId: template.toAccountId,
            notes: template.notes,
            recurringTransactionId: template.id,
          });
        }

        // Update lastGeneratedDate to the last generated date
        await this.adapter.updateRecurringTransaction({
          id: template.id,
          lastGeneratedDate: dueDates[dueDates.length - 1],
        });
      }
    } catch (error) {
      // Generation errors are non-fatal — log and continue
      ErrorHandler.handle(error, 'RecurringTransactionsService.generateDueTransactions');
    }
  }
}
