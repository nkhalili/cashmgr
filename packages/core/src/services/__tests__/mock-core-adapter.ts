/**
 * Minimal in-memory DatabaseAdapter for core service tests (export/import)
 */
import type {
  DatabaseAdapter,
  BulkUpsertData,
  Account,
  Category,
  Currency,
  Transaction,
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  CreateCurrencyInput,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  UpdateCurrencyInput,
  FilterParams,
  PaginationParams,
  CategoryType,
  CategoryAggregation,
} from '../../index';

interface SeedData {
  accounts?: Account[];
  categories?: Category[];
  currencies?: Currency[];
  transactions?: Transaction[];
  settings?: Record<string, string>;
}

export class MockCoreAdapter implements DatabaseAdapter {
  private accounts: Account[] = [];
  private categories: Category[] = [];
  private currencies: Currency[] = [];
  private transactions: Transaction[] = [];
  private settings: Record<string, string> = {};

  seed(data: SeedData): void {
    if (data.accounts) this.accounts.push(...data.accounts);
    if (data.categories) this.categories.push(...data.categories);
    if (data.currencies) this.currencies.push(...data.currencies);
    if (data.transactions) this.transactions.push(...data.transactions);
    if (data.settings) Object.assign(this.settings, data.settings);
  }

  // Accounts
  async getAccounts(): Promise<Account[]> { return [...this.accounts]; }
  async getAccountById(id: string): Promise<Account | null> {
    return this.accounts.find((a) => a.id === id) ?? null;
  }
  async createAccount(input: CreateAccountInput): Promise<Account> {
    const now = Date.now();
    const account: Account = {
      id: `acc-${Date.now()}`,
      name: input.name,
      type: input.type,
      balance: input.initialBalance ?? 0,
      initialBalance: input.initialBalance ?? 0,
      currency: input.currency ?? 'USD',
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.push(account);
    return account;
  }
  async updateAccount(input: UpdateAccountInput): Promise<Account> {
    const idx = this.accounts.findIndex((a) => a.id === input.id);
    if (idx === -1) throw new Error(`Account ${input.id} not found`);
    this.accounts[idx] = { ...this.accounts[idx], ...input, updatedAt: Date.now() };
    return this.accounts[idx];
  }
  async deleteAccount(id: string): Promise<void> {
    this.accounts = this.accounts.filter((a) => a.id !== id);
  }

  // Categories
  async getCategories(activeOnly = false): Promise<Category[]> {
    return activeOnly ? this.categories.filter((c) => c.isActive) : [...this.categories];
  }
  async getCategoryById(id: string): Promise<Category | null> {
    return this.categories.find((c) => c.id === id) ?? null;
  }
  async getCategoriesByType(type: CategoryType, activeOnly = false): Promise<Category[]> {
    const result = this.categories.filter((c) => c.type === type);
    return activeOnly ? result.filter((c) => c.isActive) : result;
  }
  async getSubcategories(parentId: string, activeOnly = false): Promise<Category[]> {
    const result = this.categories.filter((c) => c.parentId === parentId);
    return activeOnly ? result.filter((c) => c.isActive) : result;
  }
  async getTopLevelCategories(activeOnly = false): Promise<Category[]> {
    const result = this.categories.filter((c) => !c.parentId);
    return activeOnly ? result.filter((c) => c.isActive) : result;
  }
  async hasSubcategories(id: string): Promise<boolean> {
    return this.categories.some((c) => c.parentId === id);
  }
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const now = Date.now();
    const category: Category = {
      id: `cat-${now}`,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.push(category);
    return category;
  }
  async updateCategory(input: UpdateCategoryInput): Promise<Category> {
    const idx = this.categories.findIndex((c) => c.id === input.id);
    if (idx === -1) throw new Error(`Category ${input.id} not found`);
    const updated = { ...this.categories[idx], ...input, updatedAt: Date.now() };
    if (updated.parentId === null) updated.parentId = undefined;
    this.categories[idx] = updated as Category;
    return this.categories[idx];
  }
  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
  }

  // Currencies
  async getCurrencies(activeOnly = false): Promise<Currency[]> {
    return activeOnly ? this.currencies.filter((c) => c.isActive) : [...this.currencies];
  }
  async getCurrencyById(id: string): Promise<Currency | null> {
    return this.currencies.find((c) => c.id === id) ?? null;
  }
  async getPrimaryCurrency(): Promise<Currency | null> {
    return this.currencies.find((c) => c.isPrimary) ?? null;
  }
  async createCurrency(input: CreateCurrencyInput): Promise<Currency> {
    const now = Date.now();
    const currency: Currency = {
      id: input.id,
      name: input.name,
      symbol: input.symbol,
      isPrimary: input.isPrimary ?? false,
      exchangeRate: input.exchangeRate ?? 1,
      lastUpdated: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.currencies.push(currency);
    return currency;
  }
  async updateCurrency(input: UpdateCurrencyInput): Promise<Currency> {
    const idx = this.currencies.findIndex((c) => c.id === input.id);
    if (idx === -1) throw new Error(`Currency ${input.id} not found`);
    this.currencies[idx] = { ...this.currencies[idx], ...input, updatedAt: Date.now() };
    return this.currencies[idx];
  }
  async deleteCurrency(id: string): Promise<void> {
    this.currencies = this.currencies.filter((c) => c.id !== id);
  }

  // Transactions
  async getTransactions(filter?: FilterParams, pagination?: PaginationParams): Promise<Transaction[]> {
    let result = [...this.transactions];
    if (filter?.dateRange?.startDate) result = result.filter((t) => t.date >= filter.dateRange!.startDate);
    if (filter?.dateRange?.endDate) result = result.filter((t) => t.date <= filter.dateRange!.endDate);
    if (filter?.accountId) result = result.filter((t) => t.accountId === filter.accountId || t.toAccountId === filter.accountId);
    if (filter?.categoryId) result = result.filter((t) => t.categoryId === filter.categoryId);
    if (filter?.type) result = result.filter((t) => t.type === filter.type);
    if (pagination) {
      result = result.slice(pagination.offset, pagination.offset + pagination.limit);
    }
    return result;
  }
  async getTransactionById(id: string): Promise<Transaction | null> {
    return this.transactions.find((t) => t.id === id) ?? null;
  }
  async getTransactionAggregateByCategory(): Promise<CategoryAggregation[]> { return []; }
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const now = Date.now();
    const tx: Transaction = {
      id: `tx-${now}`,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      date: input.date,
      accountId: input.accountId,
      categoryId: input.categoryId,
      toAccountId: input.toAccountId,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.push(tx);
    return tx;
  }
  async updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
    const idx = this.transactions.findIndex((t) => t.id === input.id);
    if (idx === -1) throw new Error(`Transaction ${input.id} not found`);
    this.transactions[idx] = { ...this.transactions[idx], ...input, updatedAt: Date.now() };
    return this.transactions[idx];
  }
  async deleteTransaction(id: string): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.id !== id);
  }

  // Settings
  async getSetting(key: string): Promise<string | null> { return this.settings[key] ?? null; }
  async setSetting(key: string, value: string): Promise<void> { this.settings[key] = value; }
  async deleteSetting(key: string): Promise<void> { delete this.settings[key]; }
  async getAllSettings(): Promise<Record<string, string>> { return { ...this.settings }; }

  async bulkUpsert(data: BulkUpsertData): Promise<void> {
    if (data.clearExisting) {
      this.accounts = [];
      this.categories = [];
      this.currencies = [];
      this.transactions = [];
      this.settings = {};
    }
    const upsert = <T extends { id: string }>(arr: T[], items: T[] = []) => {
      for (const item of items) {
        const idx = arr.findIndex((x) => x.id === item.id);
        if (idx >= 0) arr[idx] = item;
        else arr.push(item);
      }
    };
    upsert(this.accounts, data.accounts);
    upsert(this.categories, data.categories);
    upsert(this.currencies, data.currencies);
    upsert(this.transactions, data.transactions);
    Object.assign(this.settings, data.settings ?? {});
  }

  // Lifecycle / migrations (stubs)
  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async getCurrentSchemaVersion(): Promise<number> { return 4; }
  async runMigrations(): Promise<void> {}
  async rollbackMigration(): Promise<void> {}
}
