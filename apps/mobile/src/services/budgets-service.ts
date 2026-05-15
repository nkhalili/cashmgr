import type {
  Budget,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetWithProgress,
  DatabaseAdapter,
} from '@cashmgr/core';
import {
  CreateBudgetInputSchema,
  UpdateBudgetInputSchema,
  ErrorHandler,
  NotFoundError,
  ValidationError,
} from '@cashmgr/core';

export class BudgetsService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async getBudgetById(id: string): Promise<Budget | null> {
    try {
      return await this.adapter.getBudgetById(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'BudgetsService.getBudgetById');
    }
  }

  async listBudgets(month: number, year: number): Promise<Budget[]> {
    try {
      return await this.adapter.getBudgets(month, year);
    } catch (error) {
      throw ErrorHandler.handle(error, 'BudgetsService.listBudgets');
    }
  }

  async getBudgetsWithProgress(month: number, year: number): Promise<BudgetWithProgress[]> {
    try {
      const now = new Date();
      const currentPeriod = now.getFullYear() * 12 + (now.getMonth() + 1);
      if (year * 12 + month >= currentPeriod) {
        const defaults = await this.adapter.getBudgetDefaults(month, year);
        for (const def of defaults) {
          await this.adapter.createBudget({ categoryId: def.categoryId, amount: def.amount, month, year });
        }
      }
      return await this.adapter.getBudgetsWithProgress(month, year);
    } catch (error) {
      throw ErrorHandler.handle(error, 'BudgetsService.getBudgetsWithProgress');
    }
  }

  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    try {
      const validated = CreateBudgetInputSchema.parse(input);

      const category = await this.adapter.getCategoryById(validated.categoryId);
      if (!category) {
        throw new NotFoundError('Category', validated.categoryId);
      }

      const existing = await this.adapter.getBudgets(validated.month, validated.year);
      const duplicate = existing.find((b) => b.categoryId === validated.categoryId);
      if (duplicate) {
        throw new Error(`A budget for this category already exists for ${validated.month}/${validated.year}`);
      }

      return await this.adapter.createBudget(validated);
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'BudgetsService.createBudget');
    }
  }

  async updateBudget(id: string, updates: Omit<UpdateBudgetInput, 'id'>): Promise<Budget> {
    try {
      const budget = await this.adapter.getBudgetById(id);
      if (!budget) {
        throw new NotFoundError('Budget', id);
      }

      const validated = UpdateBudgetInputSchema.parse({ id, ...updates });
      return await this.adapter.updateBudget(validated);
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      throw ErrorHandler.handle(error, 'BudgetsService.updateBudget');
    }
  }

  async deleteBudget(id: string): Promise<void> {
    try {
      const budget = await this.adapter.getBudgetById(id);
      if (!budget) {
        throw new NotFoundError('Budget', id);
      }
      await this.adapter.deleteBudget(id);
    } catch (error) {
      throw ErrorHandler.handle(error, 'BudgetsService.deleteBudget');
    }
  }
}
