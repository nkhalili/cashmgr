import type { Account, CreateAccountInput, UpdateAccountInput, DatabaseAdapter } from '@cashmgr/core';
import { CreateAccountInputSchema, ErrorHandler, NotFoundError, ValidationError, validateAccountBusinessRules, DEFAULT_CURRENCY } from '@cashmgr/core';

/**
 * Default account templates for quick setup
 */
const DEFAULT_ACCOUNTS: CreateAccountInput[] = [
  { name: 'Cash', type: 'cash', initialBalance: 0, currency: DEFAULT_CURRENCY },
  { name: 'Chequing', type: 'bank', initialBalance: 0, currency: DEFAULT_CURRENCY },
  { name: 'Savings', type: 'bank', initialBalance: 0, currency: DEFAULT_CURRENCY },
];

/**
 * AccountsService
 * F-021: Uses DatabaseAdapter for platform-agnostic data access
 * F-023: Validates all inputs before calling adapter
 * F-024: Uses ErrorHandler for centralized error handling
 */
export class AccountsService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async listAccounts(): Promise<Account[]> {
    try {
      return await this.adapter.getAccounts();
    } catch (error) {
      throw ErrorHandler.handle(error, 'AccountsService.listAccounts');
    }
  }

  async createAccount(input: CreateAccountInput): Promise<Account> {
    try {
      // F-023: Validate input schema
      const validated = CreateAccountInputSchema.parse(input);

      // F-023: Business logic validation
      validateAccountBusinessRules(validated);

      // Call adapter with validated data
      return await this.adapter.createAccount(validated);
    } catch (error) {
      // F-023: Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      // Rethrow ValidationError directly — user-triggered, not an unexpected error
      if (error instanceof ValidationError) {
        throw error;
      }
      // F-024: Use ErrorHandler for all other errors
      throw ErrorHandler.handle(error, 'AccountsService.createAccount');
    }
  }

  /**
   * F-027: Update an existing account
   * Only name and type can be updated (not initialBalance)
   */
  async updateAccount(id: string, updates: Partial<CreateAccountInput>): Promise<Account> {
    try {
      // Get current account to merge updates
      const current = await this.adapter.getAccountById(id);
      if (!current) {
        throw new NotFoundError('Account', id);
      }

      // Merge updates with current values for validation (only input fields)
      const inputToValidate = {
        name: updates.name !== undefined ? updates.name : current.name,
        type: updates.type !== undefined ? updates.type : current.type,
        initialBalance: current.initialBalance,
        currency: updates.currency !== undefined ? updates.currency : current.currency,
      };

      // Validate merged data
      const validated = CreateAccountInputSchema.parse(inputToValidate);
      validateAccountBusinessRules(validated);

      // Update only the provided fields
      const updateInput: UpdateAccountInput = { id };
      if (updates.name !== undefined) updateInput.name = validated.name;
      if (updates.type !== undefined) updateInput.type = validated.type;
      if (updates.currency !== undefined) updateInput.currency = validated.currency;

      return await this.adapter.updateAccount(updateInput);
    } catch (error) {
      // F-023: Convert Zod errors to ValidationError
      if (error && typeof error === 'object' && 'issues' in error) {
        throw ValidationError.fromZodError(error);
      }
      // F-024: Use ErrorHandler for all other errors
      throw ErrorHandler.handle(error, 'AccountsService.updateAccount');
    }
  }

  /**
   * F-027: Delete an account
   * Note: MVP implementation does not check for transactions
   * Future: Block delete if transactions exist (see F-027 PBI)
   */
  async deleteAccount(id: string): Promise<void> {
    try {
      // Verify account exists
      const account = await this.adapter.getAccountById(id);
      if (!account) {
        throw new NotFoundError('Account', id);
      }

      await this.adapter.deleteAccount(id);
    } catch (error) {
      // F-024: Use ErrorHandler for all other errors
      throw ErrorHandler.handle(error, 'AccountsService.deleteAccount');
    }
  }

  /**
   * Create default accounts from template (Cash, Chequing, Savings)
   */
  async createDefaultAccounts(): Promise<Account[]> {
    try {
      const created: Account[] = [];

      for (const accountInput of DEFAULT_ACCOUNTS) {
        const account = await this.adapter.createAccount(accountInput);
        created.push(account);
      }

      return created;
    } catch (error) {
      throw ErrorHandler.handle(error, 'AccountsService.createDefaultAccounts');
    }
  }
}
