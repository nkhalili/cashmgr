import { Transaction, CreateTransactionInput, UpdateTransactionInput } from '../models/Transaction';
import { Account, CreateAccountInput, UpdateAccountInput } from '../models/Account';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../models/Category';
import { Currency, CreateCurrencyInput, UpdateCurrencyInput } from '../models/Currency';
import { Budget, CreateBudgetInput, UpdateBudgetInput, BudgetWithProgress } from '../models/Budget';
import { RecurringTransaction, CreateRecurringTransactionInput, UpdateRecurringTransactionInput } from '../models/RecurringTransaction';
import { CategoryType, CategoryAggregation, FilterParams, PaginationParams } from '../types';

/**
 * F-062: Data for bulk upsert (used by import service)
 * clearExisting=true deletes all existing data before inserting (replace mode)
 * clearExisting=false merges/upserts into existing data (merge mode)
 */
export interface BulkUpsertData {
  accounts?: Account[];
  categories?: Category[];
  currencies?: Currency[];
  transactions?: Transaction[];
  budgets?: Budget[];
  deletedBudgets?: Budget[];
  recurringTransactions?: RecurringTransaction[];
  settings?: Record<string, string>;
  clearExisting?: boolean;
}

/**
 * Abstract database adapter interface
 * Platform-specific implementations will be provided by the db package
 */
export interface DatabaseAdapter {
  // Transaction operations
  createTransaction(input: CreateTransactionInput): Promise<Transaction>;
  getTransactionById(id: string): Promise<Transaction | null>;
  getTransactions(filter?: FilterParams, pagination?: PaginationParams): Promise<Transaction[]>;
  getTransactionAggregateByCategory(filter: FilterParams): Promise<CategoryAggregation[]>;
  updateTransaction(input: UpdateTransactionInput): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Account operations
  createAccount(input: CreateAccountInput): Promise<Account>;
  getAccountById(id: string): Promise<Account | null>;
  getAccounts(): Promise<Account[]>;
  updateAccount(input: UpdateAccountInput): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  // Category operations (F-003)
  createCategory(input: CreateCategoryInput): Promise<Category>;
  getCategoryById(id: string): Promise<Category | null>;
  getCategories(activeOnly?: boolean): Promise<Category[]>;
  getCategoriesByType(type: CategoryType, activeOnly?: boolean): Promise<Category[]>;
  getSubcategories(parentId: string, activeOnly?: boolean): Promise<Category[]>;
  getTopLevelCategories(activeOnly?: boolean): Promise<Category[]>;
  updateCategory(input: UpdateCategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  hasSubcategories(id: string): Promise<boolean>;

  // Currency operations (F-030)
  createCurrency(input: CreateCurrencyInput): Promise<Currency>;
  getCurrencyById(id: string): Promise<Currency | null>;
  getCurrencies(activeOnly?: boolean): Promise<Currency[]>;
  getPrimaryCurrency(): Promise<Currency | null>;
  updateCurrency(input: UpdateCurrencyInput): Promise<Currency>;
  deleteCurrency(id: string): Promise<void>;

  // Settings operations (F-030)
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  deleteSetting(key: string): Promise<void>;

  // Database lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // F-062: Export/Import operations
  getAllSettings(): Promise<Record<string, string>>;
  bulkUpsert(data: BulkUpsertData): Promise<void>;

  // Budget operations (F-063)
  createBudget(input: CreateBudgetInput): Promise<Budget>;
  getBudgetById(id: string): Promise<Budget | null>;
  getBudgets(month: number, year: number): Promise<Budget[]>;
  getAllBudgets(): Promise<Budget[]>;
  getEffectiveTombstones(): Promise<Budget[]>;
  getBudgetsWithProgress(month: number, year: number): Promise<BudgetWithProgress[]>;
  getBudgetDefaults(month: number, year: number): Promise<{ categoryId: string; amount: number }[]>;
  updateBudget(input: UpdateBudgetInput): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;

  // Recurring transaction operations
  createRecurringTransaction(input: CreateRecurringTransactionInput): Promise<RecurringTransaction>;
  getRecurringTransactionById(id: string): Promise<RecurringTransaction | null>;
  getRecurringTransactions(activeOnly?: boolean): Promise<RecurringTransaction[]>;
  updateRecurringTransaction(input: UpdateRecurringTransactionInput): Promise<RecurringTransaction>;
  deleteRecurringTransaction(id: string): Promise<void>;
  getTransactionsByRecurringId(recurringId: string): Promise<Transaction[]>;

  // Migration operations (F-022)
  getCurrentSchemaVersion(): Promise<number>;
  runMigrations(targetVersion?: number): Promise<void>;
  rollbackMigration(targetVersion: number): Promise<void>;
}
