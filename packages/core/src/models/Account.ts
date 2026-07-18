import { BaseEntity, AccountType } from '../types';
import { CreateAccountInputSchema, UpdateAccountInputSchema } from '../validation';
import { z } from 'zod';

/**
 * Account Entity
 * Represents a financial account (bank, cash, credit)
 */
export interface Account extends BaseEntity {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  initialBalance: number;
  /** Day of month (1-31) the credit card statement closes. Credit accounts only. */
  statementDay?: number | null;
  /** Day of month (1-31) the credit card payment is due. Credit accounts only. */
  paymentDay?: number | null;
  /** Account auto-payments are drawn from. Credit accounts only. */
  paymentAccountId?: string | null;
  /** Whether auto-payment is turned on for this credit account. */
  autoPaymentEnabled: boolean;
  /** 'full' pays the full Balance Payable; 'fixed' pays autoPaymentFixedAmount (capped at Balance Payable). */
  autoPaymentMode?: 'full' | 'fixed' | null;
  autoPaymentFixedAmount?: number | null;
  /** Internal bookkeeping: last payment due date (YYYY-MM-DD) auto-pay has already processed. Not user-editable. */
  lastAutoPaymentDate?: string | null;
}

/**
 * Display order and group labels for account types, used to group accounts
 * (e.g. in the Accounts page and account pickers) consistently across apps.
 */
export const ACCOUNT_TYPE_GROUPS: { type: AccountType; label: string }[] = [
  { type: 'cash', label: 'Cash' },
  { type: 'bank', label: 'Bank Accounts' },
  { type: 'credit', label: 'Credit Cards' },
];

/**
 * Create Account Input
 * F-023: Type inferred from Zod schema for type safety
 */
export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;

/**
 * Update Account Input
 * F-023: Type inferred from Zod schema for type safety
 */
export type UpdateAccountInput = z.infer<typeof UpdateAccountInputSchema>;
