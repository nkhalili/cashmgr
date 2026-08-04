/**
 * Validation Schemas
 * F-023: Zod schemas for input validation
 */

import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Account Type Schema
 */
export const AccountTypeSchema = z.enum(['cash', 'bank', 'credit'], {
  message: 'Account type must be cash, bank, or credit',
});

/**
 * Currency Code Schema
 * ISO 4217 currency codes (3 uppercase letters)
 */
export const CurrencyCodeSchema = z
  .string()
  .length(3, 'Currency must be a 3-letter code (e.g., USD, EUR, GBP)')
  .regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters')
  .default('USD');

/**
 * Date String Schema
 * B-001: Validates date strings in YYYY-MM-DD format (timezone-agnostic)
 */
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      // Verify it's a valid date
      const [year, month, day] = val.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    },
    'Date must be a valid calendar date'
  );

/**
 * Auto Payment Mode Schema
 * 'full' pays the full Balance Payable each cycle; 'fixed' pays a fixed amount (capped at Balance Payable).
 */
export const AutoPaymentModeSchema = z.enum(['full', 'fixed'], {
  message: 'Auto payment mode must be full or fixed',
});

/**
 * Create Account Input Schema
 *
 * Validates input for creating a new account
 */
export const CreateAccountInputSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Account name is required')
      .max(100, 'Account name must be less than 100 characters')
      .trim(),
    type: AccountTypeSchema,
    initialBalance: z
      .number()
      .optional()
      .default(0),
    currency: CurrencyCodeSchema.optional(),
    statementDay: z.number().int().min(1).max(31).optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
    paymentAccountId: z.string().optional(),
    autoPaymentEnabled: z.boolean().optional(),
    autoPaymentMode: AutoPaymentModeSchema.optional(),
    autoPaymentFixedAmount: z.number().positive().optional(),
  })
  .strict(); // Don't allow extra properties

/**
 * Update Account Input Schema
 *
 * Validates input for updating an existing account
 * All fields except ID are optional
 */
export const UpdateAccountInputSchema = z
  .object({
    id: z.string().min(1, 'Account ID is required'),
    name: z
      .string()
      .min(1, 'Account name cannot be empty')
      .max(100, 'Account name must be less than 100 characters')
      .trim()
      .optional(),
    type: AccountTypeSchema.optional(),
    balance: z.number().optional(),
    initialBalance: z.number().optional(),
    currency: CurrencyCodeSchema.optional(),
    statementDay: z.number().int().min(1).max(31).nullable().optional(),
    paymentDay: z.number().int().min(1).max(31).nullable().optional(),
    paymentAccountId: z.string().nullable().optional(),
    autoPaymentEnabled: z.boolean().optional(),
    autoPaymentMode: AutoPaymentModeSchema.nullable().optional(),
    autoPaymentFixedAmount: z.number().positive().nullable().optional(),
    lastAutoPaymentDate: DateStringSchema.nullable().optional(),
  })
  .strict()
  .refine((data) => {
    // At least one field besides id must be provided
    const { id, ...rest } = data;
    return Object.keys(rest).length > 0;
  }, 'At least one field must be provided for update');

/**
 * Business Logic Validation
 *
 * Additional validation rules that depend on business logic
 * Should be called in services after schema validation
 */
export function validateAccountBusinessRules(input: {
  id?: string;
  type?: string;
  initialBalance?: number;
  statementDay?: number | null;
  paymentDay?: number | null;
  paymentAccountId?: string | null;
  autoPaymentEnabled?: boolean;
  autoPaymentMode?: string | null;
  autoPaymentFixedAmount?: number | null;
}): void {
  // Only credit accounts can have negative initial balance
  if (
    input.initialBalance !== undefined &&
    input.initialBalance < 0 &&
    input.type !== 'credit'
  ) {
    throw new ValidationError('initialBalance', 'Only credit accounts can have a negative initial balance');
  }

  const hasCreditFields =
    input.statementDay != null ||
    input.paymentDay != null ||
    input.paymentAccountId != null ||
    input.autoPaymentEnabled === true;

  if (hasCreditFields && input.type !== 'credit') {
    throw new ValidationError('type', 'Statement date, payment date, and auto payment are only available for credit accounts');
  }

  if (input.paymentAccountId != null && input.id != null && input.paymentAccountId === input.id) {
    throw new ValidationError('paymentAccountId', 'Payment account cannot be the credit account itself');
  }

  if (input.autoPaymentEnabled) {
    if (input.statementDay == null || input.paymentDay == null || input.paymentAccountId == null) {
      throw new ValidationError('autoPaymentEnabled', 'Auto payment requires a statement date, payment date, and payment account');
    }
  }

  if (input.autoPaymentMode === 'fixed' && (input.autoPaymentFixedAmount == null || input.autoPaymentFixedAmount <= 0)) {
    throw new ValidationError('autoPaymentFixedAmount', 'A fixed payment amount greater than 0 is required');
  }
}

/**
 * Currency Symbol Schema
 * F-030: Validates currency symbols (1-3 characters)
 */
export const CurrencySymbolSchema = z
  .string()
  .trim()
  .min(1, 'Currency symbol is required')
  .max(3, 'Currency symbol must be 1-3 characters');

/**
 * Currency Name Schema
 * F-030: Validates currency full names
 */
export const CurrencyNameSchema = z
  .string()
  .trim()
  .min(1, 'Currency name is required')
  .max(50, 'Currency name must be less than 50 characters');

/**
 * Exchange Rate Schema
 * F-030: Validates exchange rates (positive numbers with up to 6 decimal places)
 */
export const ExchangeRateSchema = z
  .number()
  .positive('Exchange rate must be positive')
  .refine(
    (val) => {
      const decimals = val.toString().split('.')[1]?.length || 0;
      return decimals <= 6;
    },
    'Exchange rate can have at most 6 decimal places'
  );

/**
 * Create Currency Input Schema
 * F-030: Validates input for creating a new currency
 */
export const CreateCurrencyInputSchema = z
  .object({
    id: z
      .string()
      .length(3, 'Currency must be a 3-letter code (e.g., USD, EUR, GBP)')
      .regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters'),
    name: CurrencyNameSchema,
    symbol: CurrencySymbolSchema,
    exchangeRate: ExchangeRateSchema.default(1.0),
    isPrimary: z.boolean().default(false),
  })
  .strict();

/**
 * Update Currency Input Schema
 * F-030: Validates input for updating an existing currency
 */
export const UpdateCurrencyInputSchema = z
  .object({
    id: z.string().min(1, 'Currency ID is required'),
    name: CurrencyNameSchema.optional(),
    symbol: CurrencySymbolSchema.optional(),
    exchangeRate: ExchangeRateSchema.optional(),
    isPrimary: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => {
    // At least one field besides id must be provided
    const { id, ...rest } = data;
    return Object.keys(rest).length > 0;
  }, 'At least one field must be provided for update');

/**
 * Currency Business Logic Validation
 * F-030: Additional validation rules for currency operations
 */
export function validateCurrencyBusinessRules(input: {
  isPrimary?: boolean;
  exchangeRate?: number;
}): void {
  // Primary currency must have exchange rate of 1.0
  if (input.isPrimary && input.exchangeRate !== undefined && input.exchangeRate !== 1.0) {
    throw new Error('Primary currency must have exchange rate of 1.0');
  }
}

/**
 * Category Type Schema
 * F-003: Categories are either income or expense
 */
export const CategoryTypeSchema = z.enum(['income', 'expense'], {
  message: 'Category type must be income or expense',
});

/**
 * Category Color Schema
 * F-003: Validates hex color codes
 */
export const CategoryColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #FF5722)')
  .optional();

/**
 * Category Icon Schema
 * F-003: Validates emoji icons (1-10 characters to allow for emoji with modifiers)
 */
export const CategoryIconSchema = z
  .string()
  .max(10, 'Icon must be 10 characters or less')
  .optional();

/**
 * Category Name Schema
 * F-003: Validates category names
 */
export const CategoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Category name is required')
  .max(100, 'Category name must be less than 100 characters');

/**
 * Create Category Input Schema
 * F-003: Validates input for creating a new category
 */
export const CreateCategoryInputSchema = z
  .object({
    name: CategoryNameSchema,
    type: CategoryTypeSchema,
    color: CategoryColorSchema,
    icon: CategoryIconSchema,
    parentId: z.string().optional(),
  })
  .strict();

/**
 * Update Category Input Schema
 * F-003: Validates input for updating an existing category
 */
export const UpdateCategoryInputSchema = z
  .object({
    id: z.string().min(1, 'Category ID is required'),
    name: CategoryNameSchema.optional(),
    type: CategoryTypeSchema.optional(),
    color: CategoryColorSchema,
    icon: CategoryIconSchema,
    parentId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => {
    // At least one field besides id must be provided
    const { id, ...rest } = data;
    return Object.keys(rest).length > 0;
  }, 'At least one field must be provided for update');

/**
 * Category Business Logic Validation
 * F-003: Additional validation rules for category operations
 */
export function validateCategoryBusinessRules(
  input: { parentId?: string | null },
  parentCategory?: { parentId?: string | null } | null
): void {
  // If parentId is provided, verify parent has no parent itself (one level only)
  if (input.parentId && parentCategory?.parentId) {
    throw new Error('Subcategories can only be one level deep');
  }
}

/**
 * Transaction Type Schema
 * F-002: Transactions are income, expense, or transfer
 */
export const TransactionTypeSchema = z.enum(['income', 'expense', 'transfer'], {
  message: 'Transaction type must be income, expense, or transfer',
});

/**
 * Transaction Notes Schema
 * F-002: Validates optional transaction notes
 */
export const TransactionNotesSchema = z
  .string()
  .max(1000, 'Notes must be less than 1000 characters')
  .optional();

/**
 * Create Transaction Input Schema
 * F-002: Validates input for creating a new transaction
 */
export const CreateTransactionInputSchema = z
  .object({
    type: TransactionTypeSchema,
    amount: z.number().positive('Amount must be positive'),
    currency: CurrencyCodeSchema,
    date: DateStringSchema,
    accountId: z.string().min(1, 'Account is required'),
    categoryId: z.string().optional(), // Optional for transfers
    toAccountId: z.string().optional(),
    notes: TransactionNotesSchema,
    recurringTransactionId: z.string().optional(), // Internal: set by recurring generation
  })
  .strict()
  .refine(
    (data) => {
      // Transfer requires toAccountId
      if (data.type === 'transfer' && !data.toAccountId) {
        return false;
      }
      return true;
    },
    { message: 'Transfer transactions require a destination account' }
  )
  .refine(
    (data) => {
      // Non-transfer should not have toAccountId
      if (data.type !== 'transfer' && data.toAccountId) {
        return false;
      }
      return true;
    },
    { message: 'Only transfer transactions can have a destination account' }
  )
  .refine(
    (data) => {
      // Income/expense require categoryId, transfer does not
      if (data.type !== 'transfer' && !data.categoryId) {
        return false;
      }
      return true;
    },
    { message: 'Category is required for income and expense transactions' }
  );

/**
 * Update Transaction Input Schema
 * F-002: Validates input for updating an existing transaction
 * Note: For clearing optional fields, use undefined (not null)
 */
export const UpdateTransactionInputSchema = z
  .object({
    id: z.string().min(1, 'Transaction ID is required'),
    type: TransactionTypeSchema.optional(),
    amount: z.number().positive('Amount must be positive').optional(),
    currency: CurrencyCodeSchema.optional(),
    date: DateStringSchema.optional(),
    accountId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    toAccountId: z.string().optional(),
    notes: TransactionNotesSchema,
  })
  .strict()
  .refine((data) => {
    // At least one field besides id must be provided
    const { id, ...rest } = data;
    return Object.keys(rest).length > 0;
  }, 'At least one field must be provided for update');

/**
 * Transaction Business Logic Validation
 * F-002: Additional validation rules for transaction operations
 */
export function validateTransactionBusinessRules(input: {
  type?: string;
  accountId?: string;
  toAccountId?: string | null;
}): void {
  // Can't transfer to same account
  if (input.type === 'transfer' && input.accountId === input.toAccountId) {
    throw new Error('Cannot transfer to the same account');
  }
}

/**
 * Budget Schemas
 * F-063: Monthly budget per category
 */
export const CreateBudgetInputSchema = z
  .object({
    categoryId: z.string().min(1, 'Category is required'),
    amount: z.number().positive('Budget amount must be positive'),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  })
  .strict();

export const UpdateBudgetInputSchema = z
  .object({
    id: z.string().min(1, 'Budget ID is required'),
    amount: z.number().positive('Budget amount must be positive').optional(),
  })
  .strict()
  .refine((data) => {
    const { id, ...rest } = data;
    return Object.keys(rest).length > 0;
  }, 'At least one field must be provided for update');

/**
 * Transaction Filter Schema
 * F-002: Validates transaction filter parameters
 */
export const TransactionFilterSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: TransactionTypeSchema.optional(),
  startDate: DateStringSchema.optional(),
  endDate: DateStringSchema.optional(),
  search: z.string().optional(),
});

/**
 * Pagination Schema
 * F-002: Validates pagination parameters
 */
export const PaginationSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Recurring Transaction Schemas
 */
export const RecurringFrequencySchema = z.enum([
  'daily',
  'weekdays',
  'weekends',
  'weekly',
  'biweekly',
  'every4weeks',
  'monthly',
  'last_day_of_month',
  'every6months',
  'annually',
], { message: 'Invalid recurrence frequency' });

export const CreateRecurringTransactionInputSchema = z
  .object({
    type: TransactionTypeSchema,
    amount: z.number().positive('Amount must be positive'),
    currency: CurrencyCodeSchema,
    accountId: z.string().min(1, 'Account is required'),
    categoryId: z.string().optional(),
    toAccountId: z.string().optional(),
    notes: TransactionNotesSchema,
    frequency: RecurringFrequencySchema,
    startDate: DateStringSchema,
    endDate: DateStringSchema.optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.type === 'transfer' && !data.toAccountId) return false;
      return true;
    },
    { message: 'Transfer requires a destination account' }
  )
  .refine(
    (data) => {
      if (data.type !== 'transfer' && !data.categoryId) return false;
      return true;
    },
    { message: 'Category is required for income and expense' }
  )
  .refine(
    (data) => {
      if (data.endDate && data.endDate <= data.startDate) return false;
      return true;
    },
    { message: 'End date must be after start date' }
  );

export const UpdateRecurringTransactionInputSchema = z
  .object({
    id: z.string().min(1, 'ID is required'),
    type: TransactionTypeSchema.optional(),
    amount: z.number().positive('Amount must be positive').optional(),
    currency: CurrencyCodeSchema.optional(),
    accountId: z.string().min(1).optional(),
    categoryId: z.string().nullable().optional(),
    toAccountId: z.string().nullable().optional(),
    notes: TransactionNotesSchema.nullable(),
    frequency: RecurringFrequencySchema.optional(),
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => {
    const { id, ...rest } = data;
    return Object.keys(rest).length > 0;
  }, 'At least one field must be provided for update');
