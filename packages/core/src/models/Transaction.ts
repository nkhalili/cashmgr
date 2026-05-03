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
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}
