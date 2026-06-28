import type { DatabaseAdapter, BulkUpsertData } from '../db/database-adapter';
import type { Account } from '../models/Account';
import type { Category } from '../models/Category';
import type { Transaction } from '../models/Transaction';
import type { Budget } from '../models/Budget';
import type { RecurringTransaction } from '../models/RecurringTransaction';
import type { ExportBackup } from './export-service';
import { EXPORT_SCHEMA_VERSION } from './export-service';
import { isValidISODate } from '../utils/date-validation';
import { recalculateBalances } from './balance-utils';

export interface ImportPreview {
  isValid: boolean;
  schemaVersion: number;
  errors: string[];
  counts: {
    accounts: number;
    transactions: number;
    categories: number;
    currencies: number;
    budgets: number;
    recurringTransactions: number;
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    accounts: number;
    transactions: number;
    categories: number;
    currencies: number;
    budgets: number;
    recurringTransactions: number;
  };
  errors: string[];
}

export type ImportMode = 'replace' | 'merge';

const MAX_VALIDATION_ERRORS = 10;

export function previewImport(content: string): ImportPreview {
  const empty = { accounts: 0, transactions: 0, categories: 0, currencies: 0, budgets: 0, recurringTransactions: 0 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { isValid: false, schemaVersion: 0, errors: ['Invalid JSON format'], counts: empty };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, schemaVersion: 0, errors: ['Invalid backup format'], counts: empty };
  }

  const b = parsed as Record<string, unknown>;
  const errors: string[] = [];

  if (!b.metadata || typeof b.metadata !== 'object') {
    return { isValid: false, schemaVersion: 0, errors: ['Missing metadata'], counts: empty };
  }

  const meta = b.metadata as Record<string, unknown>;
  const schemaVersion = typeof meta.schemaVersion === 'number' ? meta.schemaVersion : 0;

  if (meta.appName !== 'CashMgr') {
    errors.push(`Unrecognised app name: "${meta.appName as string}"`);
  }
  if (schemaVersion > EXPORT_SCHEMA_VERSION) {
    errors.push(
      `Schema version ${schemaVersion} is newer than supported (${EXPORT_SCHEMA_VERSION})`,
    );
  }

  if (!b.data || typeof b.data !== 'object') {
    return { isValid: false, schemaVersion, errors: [...errors, 'Missing data field'], counts: empty };
  }

  const data = b.data as Record<string, unknown>;
  const accounts = Array.isArray(data.accounts) ? (data.accounts as unknown[]) : [];
  const transactions = Array.isArray(data.transactions) ? (data.transactions as unknown[]) : [];
  const categories = Array.isArray(data.categories) ? (data.categories as unknown[]) : [];
  const currencies = Array.isArray(data.currencies) ? (data.currencies as unknown[]) : [];
  const budgets = Array.isArray(data.budgets) ? (data.budgets as unknown[]) : [];
  const recurringTransactions = Array.isArray(data.recurringTransactions) ? (data.recurringTransactions as unknown[]) : [];

  errors.push(...validateEntities(accounts, ['id', 'name', 'type'], 'account'));
  errors.push(...validateEntities(categories, ['id', 'name', 'type'], 'category'));
  errors.push(...validateEntities(currencies, ['id', 'name', 'symbol'], 'currency'));
  errors.push(...validateTransactionEntities(transactions));
  errors.push(...validateBudgetEntities(budgets));
  errors.push(...validateRecurringTransactionEntities(recurringTransactions));

  return {
    isValid: errors.length === 0,
    schemaVersion,
    errors,
    counts: {
      accounts: accounts.length,
      transactions: transactions.length,
      categories: categories.length,
      currencies: currencies.length,
      budgets: budgets.length,
      recurringTransactions: recurringTransactions.length,
    },
  };
}

function validateEntities(
  entities: unknown[],
  requiredFields: string[],
  entityName: string,
): string[] {
  const errors: string[] = [];
  for (let i = 0; i < entities.length && errors.length < MAX_VALIDATION_ERRORS; i++) {
    const obj = entities[i];
    if (!obj || typeof obj !== 'object') {
      errors.push(`${entityName}[${i}]: must be an object`);
      continue;
    }
    const record = obj as Record<string, unknown>;
    for (const field of requiredFields) {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        errors.push(`${entityName}[${i}]: missing required field '${field}'`);
      }
    }
  }
  return errors;
}

function validateTransactionEntities(transactions: unknown[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < transactions.length && errors.length < MAX_VALIDATION_ERRORS; i++) {
    const obj = transactions[i];
    if (!obj || typeof obj !== 'object') {
      errors.push(`transaction[${i}]: must be an object`);
      continue;
    }
    const tx = obj as Record<string, unknown>;
    if (!tx.id) errors.push(`transaction[${i}]: missing id`);
    if (!tx.type) errors.push(`transaction[${i}]: missing type`);
    if (typeof tx.amount !== 'number' || tx.amount <= 0) {
      errors.push(`transaction[${i}]: invalid amount`);
    }
    if (typeof tx.date !== 'string' || !isValidISODate(tx.date)) {
      errors.push(`transaction[${i}]: invalid date (expected YYYY-MM-DD)`);
    }
    if (!tx.accountId) errors.push(`transaction[${i}]: missing accountId`);
  }
  return errors;
}

function validateBudgetEntities(budgets: unknown[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < budgets.length && errors.length < MAX_VALIDATION_ERRORS; i++) {
    const obj = budgets[i];
    if (!obj || typeof obj !== 'object') {
      errors.push(`budget[${i}]: must be an object`);
      continue;
    }
    const b = obj as Record<string, unknown>;
    if (!b.id) errors.push(`budget[${i}]: missing id`);
    if (!b.categoryId) errors.push(`budget[${i}]: missing categoryId`);
    if (typeof b.amount !== 'number' || b.amount <= 0) errors.push(`budget[${i}]: invalid amount`);
    if (typeof b.month !== 'number' || b.month < 1 || b.month > 12) errors.push(`budget[${i}]: invalid month`);
    if (typeof b.year !== 'number' || b.year < 2000) errors.push(`budget[${i}]: invalid year`);
  }
  return errors;
}

function validateRecurringTransactionEntities(rts: unknown[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < rts.length && errors.length < MAX_VALIDATION_ERRORS; i++) {
    const obj = rts[i];
    if (!obj || typeof obj !== 'object') {
      errors.push(`recurringTransaction[${i}]: must be an object`);
      continue;
    }
    const rt = obj as Record<string, unknown>;
    if (!rt.id) errors.push(`recurringTransaction[${i}]: missing id`);
    if (!rt.type) errors.push(`recurringTransaction[${i}]: missing type`);
    if (typeof rt.amount !== 'number' || rt.amount <= 0) errors.push(`recurringTransaction[${i}]: invalid amount`);
    if (!rt.accountId) errors.push(`recurringTransaction[${i}]: missing accountId`);
    if (!rt.frequency) errors.push(`recurringTransaction[${i}]: missing frequency`);
    if (typeof rt.startDate !== 'string' || !isValidISODate(rt.startDate)) {
      errors.push(`recurringTransaction[${i}]: invalid startDate`);
    }
  }
  return errors;
}

function validateReferentialIntegrity(
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  budgets: Budget[],
): string[] {
  const accountIds = new Set(accounts.map((a) => a.id));
  const categoryIds = new Set(categories.map((c) => c.id));
  const errors: string[] = [];

  for (let i = 0; i < transactions.length && errors.length < MAX_VALIDATION_ERRORS; i++) {
    const tx = transactions[i];
    if (!accountIds.has(tx.accountId)) {
      errors.push(`transaction[${i}]: unknown accountId '${tx.accountId}'`);
    }
    if (tx.toAccountId && !accountIds.has(tx.toAccountId)) {
      errors.push(`transaction[${i}]: unknown toAccountId '${tx.toAccountId}'`);
    }
    if (tx.categoryId && !categoryIds.has(tx.categoryId)) {
      errors.push(`transaction[${i}]: unknown categoryId '${tx.categoryId}'`);
    }
  }

  for (let i = 0; i < budgets.length && errors.length < MAX_VALIDATION_ERRORS; i++) {
    if (!categoryIds.has(budgets[i].categoryId)) {
      errors.push(`budget[${i}]: unknown categoryId '${budgets[i].categoryId}'`);
    }
  }

  return errors;
}

const PAGE_SIZE = 1000;

export async function importData(
  db: DatabaseAdapter,
  content: string,
  mode: ImportMode,
): Promise<ImportResult> {
  const empty = { accounts: 0, transactions: 0, categories: 0, currencies: 0, budgets: 0, recurringTransactions: 0 };
  const preview = previewImport(content);

  if (!preview.isValid) {
    return { success: false, imported: empty, errors: preview.errors };
  }

  const backup = JSON.parse(content) as ExportBackup;
  const { accounts, transactions, categories, currencies = [], budgets = [], deletedBudgets = [], recurringTransactions = [], settings } = backup.data;

  const refErrors = validateReferentialIntegrity(accounts, categories, transactions, budgets);
  if (refErrors.length > 0) {
    return { success: false, imported: empty, errors: refErrors };
  }

  let upsertAccounts = accounts;
  let upsertCategories = categories;
  let upsertCurrencies = currencies;
  let upsertTransactions = transactions;
  let upsertBudgets = budgets;
  let upsertDeletedBudgets = deletedBudgets;
  let upsertRecurringTransactions: RecurringTransaction[] = recurringTransactions;

  if (mode === 'merge') {
    const [existingAccounts, existingCategories, existingCurrencies, existingBudgets, existingTombstones, existingRecurring] = await Promise.all([
      db.getAccounts(),
      db.getCategories(false),
      db.getCurrencies(false),
      db.getAllBudgets(),
      db.getEffectiveTombstones(),
      db.getRecurringTransactions(false),
    ]);

    const existingAccountMap = new Map(existingAccounts.map((a) => [a.id, a.updatedAt]));
    const existingCategoryMap = new Map(existingCategories.map((c) => [c.id, c.updatedAt]));
    const existingCurrencyMap = new Map(existingCurrencies.map((c) => [c.id, c.updatedAt]));
    const existingBudgetMap = new Map([
      ...existingBudgets.map((b) => [b.id, b.updatedAt] as [string, number]),
      ...existingTombstones.map((b) => [b.id, b.updatedAt] as [string, number]),
    ]);
    const existingRecurringMap = new Map(existingRecurring.map((r) => [r.id, r.updatedAt]));

    const existingTxIds = new Set<string>();
    let offset = 0;
    while (true) {
      const page = await db.getTransactions({}, { limit: PAGE_SIZE, offset });
      for (const tx of page) existingTxIds.add(tx.id);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    upsertAccounts = accounts.filter((a) => {
      const existing = existingAccountMap.get(a.id);
      return existing === undefined || a.updatedAt > existing;
    });
    upsertCategories = categories.filter((c) => {
      const existing = existingCategoryMap.get(c.id);
      return existing === undefined || c.updatedAt > existing;
    });
    upsertCurrencies = currencies.filter((c) => {
      const existing = existingCurrencyMap.get(c.id);
      return existing === undefined || c.updatedAt > existing;
    });
    upsertTransactions = transactions.filter((tx) => !existingTxIds.has(tx.id));
    upsertBudgets = budgets.filter((b) => {
      const existing = existingBudgetMap.get(b.id);
      return existing === undefined || b.updatedAt > existing;
    });
    upsertDeletedBudgets = deletedBudgets.filter((b) => {
      const existing = existingBudgetMap.get(b.id);
      return existing === undefined || b.updatedAt > existing;
    });
    upsertRecurringTransactions = recurringTransactions.filter((r) => {
      const existing = existingRecurringMap.get(r.id);
      return existing === undefined || r.updatedAt > existing;
    });
  }

  const upsertData: BulkUpsertData = {
    accounts: upsertAccounts,
    categories: upsertCategories,
    currencies: upsertCurrencies,
    transactions: upsertTransactions,
    budgets: upsertBudgets,
    deletedBudgets: upsertDeletedBudgets,
    recurringTransactions: upsertRecurringTransactions,
    settings: settings ?? {},
    clearExisting: mode === 'replace',
  };

  try {
    await db.bulkUpsert(upsertData);
    await recalculateBalances(db);

    return {
      success: true,
      imported: {
        accounts: upsertAccounts.length,
        transactions: upsertTransactions.length,
        categories: upsertCategories.length,
        currencies: upsertCurrencies.length,
        budgets: upsertBudgets.length,
        recurringTransactions: upsertRecurringTransactions.length,
      },
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      imported: empty,
      errors: [error instanceof Error ? error.message : 'Import failed'],
    };
  }
}
