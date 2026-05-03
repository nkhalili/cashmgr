import {
  Account,
  Category,
  CategoryAggregation,
  CategoryType,
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  Currency,
  CreateCurrencyInput,
  UpdateCurrencyInput,
  DatabaseAdapter,
  BulkUpsertData,
  FilterParams,
  PaginationParams,
  Transaction,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
} from '@cashmgr/core';
import { AccountsRepository } from '../repositories/accounts-repository';
import { CategoriesRepository } from '../repositories/categories-repository';
import { CurrenciesRepository } from '../repositories/currencies-repository';
import { SettingsRepository } from '../repositories/settings-repository';
import { TransactionsRepository } from '../repositories/transactions-repository';
import { SqliteDatabase } from '../sqlite/types';
import { getCurrentVersion, runMigrations as runMigrationsHelper, rollbackMigrations } from '../migration-runner';

export class SqliteDatabaseAdapter implements DatabaseAdapter {
  private readonly accountsRepository: AccountsRepository;
  private readonly categoriesRepository: CategoriesRepository;
  private readonly currenciesRepository: CurrenciesRepository;
  private readonly settingsRepository: SettingsRepository;
  private readonly transactionsRepository: TransactionsRepository;

  constructor(private readonly db: SqliteDatabase) {
    this.accountsRepository = new AccountsRepository(db);
    this.categoriesRepository = new CategoriesRepository(db);
    this.currenciesRepository = new CurrenciesRepository(db);
    this.settingsRepository = new SettingsRepository(db);
    this.transactionsRepository = new TransactionsRepository(db);
  }

  async initialize(): Promise<void> {
    // F-022: Use migration system instead of direct schema execution
    await this.runMigrations();
  }

  async close(): Promise<void> {
    await Promise.resolve(this.db.close());
  }

  // Transaction operations (F-002)
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    return this.transactionsRepository.create(input);
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    return this.transactionsRepository.findById(id);
  }

  async getTransactions(filter?: FilterParams, pagination?: PaginationParams): Promise<Transaction[]> {
    return this.transactionsRepository.findAll(filter, pagination);
  }

  async getTransactionAggregateByCategory(filter: FilterParams): Promise<CategoryAggregation[]> {
    return this.transactionsRepository.aggregateByCategory(filter);
  }

  async updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
    return this.transactionsRepository.update(input);
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.transactionsRepository.delete(id);
  }

  // Account operations
  async createAccount(input: CreateAccountInput): Promise<Account> {
    return this.accountsRepository.create(input);
  }

  async getAccountById(id: string): Promise<Account | null> {
    return this.accountsRepository.findById(id);
  }

  async getAccounts(): Promise<Account[]> {
    return this.accountsRepository.findAll();
  }

  async updateAccount(input: UpdateAccountInput): Promise<Account> {
    return this.accountsRepository.update(input);
  }

  async deleteAccount(id: string): Promise<void> {
    await this.accountsRepository.delete(id);
  }

  // Category operations (F-003)
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    return this.categoriesRepository.create(input);
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.categoriesRepository.findById(id);
  }

  async getCategories(activeOnly = false): Promise<Category[]> {
    return this.categoriesRepository.findAll(activeOnly);
  }

  async getCategoriesByType(type: CategoryType, activeOnly = false): Promise<Category[]> {
    return this.categoriesRepository.findByType(type, activeOnly);
  }

  async getSubcategories(parentId: string, activeOnly = false): Promise<Category[]> {
    return this.categoriesRepository.findByParentId(parentId, activeOnly);
  }

  async getTopLevelCategories(activeOnly = false): Promise<Category[]> {
    return this.categoriesRepository.findTopLevel(activeOnly);
  }

  async updateCategory(input: UpdateCategoryInput): Promise<Category> {
    return this.categoriesRepository.update(input);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoriesRepository.delete(id);
  }

  async hasSubcategories(id: string): Promise<boolean> {
    return this.categoriesRepository.hasSubcategories(id);
  }

  // Currency operations (F-030)
  async createCurrency(input: CreateCurrencyInput): Promise<Currency> {
    return this.currenciesRepository.create(input);
  }

  async getCurrencyById(id: string): Promise<Currency | null> {
    return this.currenciesRepository.findById(id);
  }

  async getCurrencies(activeOnly = false): Promise<Currency[]> {
    return this.currenciesRepository.findAll(activeOnly);
  }

  async getPrimaryCurrency(): Promise<Currency | null> {
    return this.currenciesRepository.findPrimary();
  }

  async updateCurrency(input: UpdateCurrencyInput): Promise<Currency> {
    return this.currenciesRepository.update(input);
  }

  async deleteCurrency(id: string): Promise<void> {
    await this.currenciesRepository.delete(id);
  }

  // Settings operations (F-030)
  async getSetting(key: string): Promise<string | null> {
    return this.settingsRepository.get(key);
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.settingsRepository.set(key, value);
  }

  async deleteSetting(key: string): Promise<void> {
    await this.settingsRepository.delete(key);
  }

  // F-062: Export/Import operations
  async getAllSettings(): Promise<Record<string, string>> {
    return this.settingsRepository.getAll();
  }

  async bulkUpsert(data: BulkUpsertData): Promise<void> {
    if (data.clearExisting) {
      // Delete in dependency order (transactions first, then accounts/categories)
      await this.db.execute('DELETE FROM transactions');
      await this.db.execute('DELETE FROM accounts');
      await this.db.execute('DELETE FROM categories');
      await this.db.execute('DELETE FROM currencies');
      await this.db.execute('DELETE FROM settings');
    }

    // Upsert currencies first (accounts reference currency codes as strings, no FK)
    for (const currency of data.currencies ?? []) {
      await this.db.execute(
        `INSERT OR REPLACE INTO currencies
          (id, name, symbol, is_primary, exchange_rate, last_updated, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currency.id, currency.name, currency.symbol,
          currency.isPrimary ? 1 : 0, currency.exchangeRate,
          currency.lastUpdated, currency.isActive ? 1 : 0,
          currency.createdAt, currency.updatedAt,
        ],
      );
    }

    // Upsert categories (sort: parents before children)
    const sorted = [...(data.categories ?? [])].sort((a, b) => {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      return 0;
    });
    for (const cat of sorted) {
      await this.db.execute(
        `INSERT OR REPLACE INTO categories
          (id, name, type, color, icon, parent_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cat.id, cat.name, cat.type,
          cat.color ?? null, cat.icon ?? null, cat.parentId ?? null,
          cat.isActive ? 1 : 0, cat.createdAt, cat.updatedAt,
        ],
      );
    }

    // Upsert accounts
    for (const account of data.accounts ?? []) {
      await this.db.execute(
        `INSERT OR REPLACE INTO accounts
          (id, name, type, balance, initial_balance, currency, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          account.id, account.name, account.type,
          account.balance, account.initialBalance, account.currency,
          account.createdAt, account.updatedAt,
        ],
      );
    }

    // Upsert transactions
    for (const tx of data.transactions ?? []) {
      await this.db.execute(
        `INSERT OR REPLACE INTO transactions
          (id, type, amount, currency, date, account_id, category_id, to_account_id, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tx.id, tx.type, tx.amount, tx.currency, tx.date,
          tx.accountId, tx.categoryId ?? null, tx.toAccountId ?? null,
          tx.notes ?? null,
          tx.createdAt, tx.updatedAt,
        ],
      );
    }

    // Upsert settings
    const now = Date.now();
    for (const [key, value] of Object.entries(data.settings ?? {})) {
      await this.db.execute(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, value, now],
      );
    }
  }

  // Migration operations (F-022)
  async getCurrentSchemaVersion(): Promise<number> {
    return getCurrentVersion(this.db);
  }

  async runMigrations(targetVersion?: number): Promise<void> {
    await runMigrationsHelper(this.db, targetVersion);
  }

  async rollbackMigration(targetVersion: number): Promise<void> {
    await rollbackMigrations(this.db, targetVersion);
  }
}
