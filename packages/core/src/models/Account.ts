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
}

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
