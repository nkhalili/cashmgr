import { BaseEntity, TransactionType } from '../types';

export interface Transaction extends BaseEntity {
  type: TransactionType;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD format (timezone-agnostic)
  accountId: string;
  categoryId?: string; // Optional for transfers
  toAccountId?: string; // For transfers
  notes?: string;
  recurringTransactionId?: string; // Set when generated from a recurring template
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  currency?: string;
  date: string; // YYYY-MM-DD format (timezone-agnostic)
  accountId: string;
  categoryId?: string; // Optional for transfers
  toAccountId?: string;
  notes?: string;
  recurringTransactionId?: string; // Internal: set by recurring generation service
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}
