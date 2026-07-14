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
   * Name, type, currency, and (for credit accounts) statement/payment/auto-pay
   * settings can be updated. initialBalance cannot be edited.
   */
  async updateAccount(id: string, updates: Partial<CreateAccountInput>): Promise<Account> {
    try {
      // Get current account to merge updates
      const current = await this.adapter.getAccountById(id);
      if (!current) {
        throw new NotFoundError('Account', id);
      }

      const resolvedType = updates.type !== undefined ? updates.type : current.type;
      const clearingCreditFields = resolvedType !== 'credit';

      // Merge updates with current values for validation (only input fields)
      const inputToValidate = {
        name: updates.name !== undefined ? updates.name : current.name,
        type: resolvedType,
        initialBalance: current.initialBalance,
        currency: updates.currency !== undefined ? updates.currency : current.currency,
        statementDay: clearingCreditFields
          ? undefined
          : updates.statementDay !== undefined ? updates.statementDay : current.statementDay ?? undefined,
        paymentDay: clearingCreditFields
          ? undefined
          : updates.paymentDay !== undefined ? updates.paymentDay : current.paymentDay ?? undefined,
        paymentAccountId: clearingCreditFields
          ? undefined
          : updates.paymentAccountId !== undefined ? updates.paymentAccountId : current.paymentAccountId ?? undefined,
        autoPaymentEnabled: clearingCreditFields
          ? false
          : updates.autoPaymentEnabled !== undefined ? updates.autoPaymentEnabled : current.autoPaymentEnabled,
        autoPaymentMode: clearingCreditFields
          ? undefined
          : updates.autoPaymentMode !== undefined ? updates.autoPaymentMode : current.autoPaymentMode ?? undefined,
        autoPaymentFixedAmount: clearingCreditFields
          ? undefined
          : updates.autoPaymentFixedAmount !== undefined ? updates.autoPaymentFixedAmount : current.autoPaymentFixedAmount ?? undefined,
      };

      // Validate merged data
      const validated = CreateAccountInputSchema.parse(inputToValidate);
      validateAccountBusinessRules({ ...validated, id });

      // Update only the provided fields
      const updateInput: UpdateAccountInput = { id };
      if (updates.name !== undefined) updateInput.name = validated.name;
      if (updates.type !== undefined) updateInput.type = validated.type;
      if (updates.currency !== undefined) updateInput.currency = validated.currency;

      const hasExistingCreditConfig =
        current.autoPaymentEnabled ||
        current.statementDay != null ||
        current.paymentDay != null ||
        current.paymentAccountId != null ||
        current.autoPaymentMode != null ||
        current.autoPaymentFixedAmount != null;

      if (clearingCreditFields) {
        if (hasExistingCreditConfig) {
          updateInput.statementDay = null;
          updateInput.paymentDay = null;
          updateInput.paymentAccountId = null;
          updateInput.autoPaymentEnabled = false;
          updateInput.autoPaymentMode = null;
          updateInput.autoPaymentFixedAmount = null;
        }
      } else {
        if (updates.statementDay !== undefined) updateInput.statementDay = updates.statementDay;
        if (updates.paymentDay !== undefined) updateInput.paymentDay = updates.paymentDay;
        if (updates.paymentAccountId !== undefined) updateInput.paymentAccountId = updates.paymentAccountId;
        if (updates.autoPaymentEnabled !== undefined) updateInput.autoPaymentEnabled = updates.autoPaymentEnabled;
        if (updates.autoPaymentMode !== undefined) {
          updateInput.autoPaymentMode = updates.autoPaymentMode;
        } else if (updates.autoPaymentEnabled === false) {
          updateInput.autoPaymentMode = null;
        }
        if (updates.autoPaymentFixedAmount !== undefined) {
          updateInput.autoPaymentFixedAmount = updates.autoPaymentFixedAmount;
        } else if (updates.autoPaymentEnabled === false) {
          updateInput.autoPaymentFixedAmount = null;
        }
      }

      return await this.adapter.updateAccount(updateInput);
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

      // Block deletion if a credit account is set to auto-pay from this one
      const allAccounts = await this.adapter.getAccounts();
      const dependents = allAccounts.filter((a) => a.paymentAccountId === id);
      if (dependents.length > 0) {
        const names = dependents.map((a) => a.name).join(', ');
        throw new ValidationError(
          'paymentAccountId',
          `Cannot delete "${account.name}": it is set as the payment account for ${names}. Update or remove that payment method first.`,
        );
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
