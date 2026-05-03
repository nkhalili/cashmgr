export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR'] as const;

export const DEFAULT_CURRENCY = 'USD';

export const DATE_FORMAT = 'yyyy-MM-dd';

export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

export const ACCOUNT_TYPES = {
  CASH: 'cash',
  BANK: 'bank',
  CREDIT: 'credit',
} as const;

export const CATEGORY_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;
