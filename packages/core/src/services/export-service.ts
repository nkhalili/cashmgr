import type { DatabaseAdapter } from '../db/database-adapter';
import type { Account } from '../models/Account';
import type { Category } from '../models/Category';
import type { Currency } from '../models/Currency';
import type { Transaction } from '../models/Transaction';
import type { Budget } from '../models/Budget';
import type { RecurringTransaction } from '../models/RecurringTransaction';
import { getTodayDateString } from '../utils/date';

export const EXPORT_SCHEMA_VERSION = 6;

export interface ExportOptions {
  format: 'json' | 'csv';
  entities?: ('accounts' | 'transactions' | 'categories' | 'currencies' | 'budgets' | 'recurringTransactions' | 'settings')[];
  dateRange?: { startDate: string; endDate: string };
  platform?: string;
}

export interface ExportResult {
  filename: string;
  content: string;
  mimeType: string;
}

export interface ExportBackup {
  metadata: {
    appName: string;
    version: string;
    schemaVersion: number;
    exportDate: string;
    platform: string;
  };
  data: {
    accounts: Account[];
    categories: Category[];
    currencies: Currency[];
    transactions: Transaction[];
    budgets: Budget[];
    deletedBudgets: Budget[];
    recurringTransactions?: RecurringTransaction[];
    settings: Record<string, string>;
  };
}

const PAGE_SIZE = 1000;

async function fetchAllTransactions(
  db: DatabaseAdapter,
  dateRange?: { startDate: string; endDate: string },
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  let offset = 0;
  const filter = dateRange ? { dateRange } : {};

  while (true) {
    const page = await db.getTransactions(filter, { limit: PAGE_SIZE, offset });
    transactions.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return transactions;
}

export async function exportData(db: DatabaseAdapter, options: ExportOptions): Promise<ExportResult> {
  const today = getTodayDateString();

  if (options.format === 'csv') {
    return exportCSV(db, options, today);
  }

  return exportJSON(db, options, today);
}

async function exportJSON(
  db: DatabaseAdapter,
  options: ExportOptions,
  today: string,
): Promise<ExportResult> {
  const entities = options.entities ?? ['accounts', 'transactions', 'categories', 'currencies', 'budgets', 'recurringTransactions', 'settings'];

  const data: ExportBackup['data'] = {
    accounts: [],
    categories: [],
    currencies: [],
    transactions: [],
    budgets: [],
    deletedBudgets: [],
    recurringTransactions: [],
    settings: {},
  };

  if (entities.includes('accounts')) {
    data.accounts = await db.getAccounts();
  }
  if (entities.includes('categories')) {
    data.categories = await db.getCategories(false);
  }
  if (entities.includes('currencies')) {
    data.currencies = await db.getCurrencies(false);
  }
  if (entities.includes('transactions')) {
    data.transactions = await fetchAllTransactions(db, options.dateRange);
  }
  if (entities.includes('budgets')) {
    data.budgets = await db.getAllBudgets();
    data.deletedBudgets = await db.getEffectiveTombstones();
  }
  if (entities.includes('recurringTransactions')) {
    data.recurringTransactions = await db.getRecurringTransactions(false);
  }
  if (entities.includes('settings')) {
    data.settings = await db.getAllSettings();
  }

  const backup: ExportBackup = {
    metadata: {
      appName: 'CashMgr',
      version: '1.0.0',
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportDate: new Date().toISOString(),
      platform: options.platform ?? 'unknown',
    },
    data,
  };

  return {
    filename: `cashmgr-backup-${today}.json`,
    content: JSON.stringify(backup, null, 2),
    mimeType: 'application/json',
  };
}

async function exportCSV(
  db: DatabaseAdapter,
  options: ExportOptions,
  today: string,
): Promise<ExportResult> {
  const transactions = await fetchAllTransactions(db, options.dateRange);
  const accounts = await db.getAccounts();
  const categories = await db.getCategories(false);

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Account', 'To Account', 'Category', 'Notes'];

  const rows = transactions.map((tx) => [
    tx.date,
    tx.type,
    tx.amount.toString(),
    tx.currency,
    accountMap.get(tx.accountId) ?? tx.accountId,
    tx.toAccountId ? (accountMap.get(tx.toAccountId) ?? tx.toAccountId) : '',
    tx.categoryId ? (categoryMap.get(tx.categoryId) ?? tx.categoryId) : '',
    tx.notes ?? '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(','),
    )
    .join('\n');

  return {
    filename: `cashmgr-transactions-${today}.csv`,
    content: csvContent,
    mimeType: 'text/csv',
  };
}

