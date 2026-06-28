import type { BaseEntity, TransactionType } from '../types';

export type RecurringFrequency =
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'biweekly'
  | 'every4weeks'
  | 'monthly'
  | 'last_day_of_month'
  | 'every6months'
  | 'annually';

export const RECURRING_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Every Day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Every Week',
  biweekly: 'Every 2 Weeks',
  every4weeks: 'Every 4 Weeks',
  monthly: 'Every Month',
  last_day_of_month: 'Last Day of Month',
  every6months: 'Every 6 Months',
  annually: 'Annually',
};

export const RECURRING_FREQUENCIES: RecurringFrequency[] = [
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
];

export interface RecurringTransaction extends BaseEntity {
  type: TransactionType;
  amount: number;
  currency: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  notes?: string;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, undefined = no end
  lastGeneratedDate?: string; // YYYY-MM-DD, last date a transaction was generated
  isActive: boolean;
}

export interface CreateRecurringTransactionInput {
  type: TransactionType;
  amount: number;
  currency?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  notes?: string;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface UpdateRecurringTransactionInput {
  id: string;
  type?: TransactionType;
  amount?: number;
  currency?: string;
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  notes?: string | null;
  frequency?: RecurringFrequency;
  startDate?: string;
  endDate?: string | null;
  lastGeneratedDate?: string | null;
  isActive?: boolean;
}
