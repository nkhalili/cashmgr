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
  Budget,
  RecurringTransaction,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetWithProgress,
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  CreateCurrencyInput,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  UpdateCurrencyInput,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
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
  private budgets: Budget[] = [];
  private deletedBudgetIds = new Set<string>();
  private recurringTransactions: RecurringTransaction[] = [];
  private settings: Record<string, string> = {};
  private idCounter = 1;

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

  // Budgets
  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    const now = Date.now();
    const createdPeriod = input.year * 12 + input.month;
    const tombstone = this.budgets.find(
      (b) => b.categoryId === input.categoryId && b.month === input.month && b.year === input.year && this.deletedBudgetIds.has(b.id)
    );
    if (tombstone) {
      this.deletedBudgetIds.delete(tombstone.id);
      const updated = { ...tombstone, amount: input.amount, updatedAt: now };
      this.budgets[this.budgets.indexOf(tombstone)] = updated;
      this.clearFutureTombstones(input.categoryId, createdPeriod, input.amount, now);
      return updated;
    }
    const budget: Budget = { id: `bud-${now}`, ...input, createdAt: now, updatedAt: now };
    this.budgets.push(budget);
    this.clearFutureTombstones(input.categoryId, createdPeriod, input.amount, now);
    return budget;
  }

  private clearFutureTombstones(categoryId: string, createdPeriod: number, amount: number, now: number): void {
    for (const b of this.budgets) {
      if (b.categoryId === categoryId && this.deletedBudgetIds.has(b.id) && (b.year * 12 + b.month) > createdPeriod) {
        this.deletedBudgetIds.delete(b.id);
        const idx = this.budgets.indexOf(b);
        this.budgets[idx] = { ...b, amount, updatedAt: now };
      }
    }
  }
  async getAllBudgets(): Promise<Budget[]> {
    return this.budgets.filter((b) => !this.deletedBudgetIds.has(b.id));
  }
  async getEffectiveTombstones(): Promise<Budget[]> {
    const result: Budget[] = [];
    const categoryIds = new Set(this.budgets.map((b) => b.categoryId));
    for (const categoryId of categoryIds) {
      const all = this.budgets.filter((b) => b.categoryId === categoryId);
      const mostRecent = all.reduce((a, b) => (a.year * 12 + a.month) >= (b.year * 12 + b.month) ? a : b);
      if (this.deletedBudgetIds.has(mostRecent.id)) result.push(mostRecent);
    }
    return result;
  }
  async getBudgetById(id: string): Promise<Budget | null> {
    const b = this.budgets.find((b) => b.id === id);
    return b && !this.deletedBudgetIds.has(b.id) ? b : null;
  }
  async getBudgets(month: number, year: number): Promise<Budget[]> {
    return this.budgets.filter((b) => b.month === month && b.year === year && !this.deletedBudgetIds.has(b.id));
  }
  async getBudgetsWithProgress(month: number, year: number): Promise<BudgetWithProgress[]> {
    return this.budgets
      .filter((b) => b.month === month && b.year === year && !this.deletedBudgetIds.has(b.id))
      .map((b) => {
        const cat = this.categories.find((c) => c.id === b.categoryId);
        const childIds = this.categories.filter((c) => c.parentId === b.categoryId).map((c) => c.id);
        const spent = this.transactions
          .filter((t) => t.type === 'expense' && (t.categoryId === b.categoryId || childIds.includes(t.categoryId ?? '')))
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          ...b,
          categoryName: cat?.name ?? '',
          categoryColor: cat?.color,
          categoryIcon: cat?.icon,
          spent,
          remaining: b.amount - spent,
          percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
        };
      });
  }
  async getBudgetDefaults(month: number, year: number): Promise<{ categoryId: string; amount: number }[]> {
    const requestedPeriod = year * 12 + month;
    // A row for the requested period (active or deleted) blocks propagation
    const existingIds = new Set(
      this.budgets.filter((b) => b.year === year && b.month === month).map((b) => b.categoryId)
    );
    const latest = new Map<string, { period: number; amount: number; isDeleted: boolean }>();
    for (const b of this.budgets) {
      const period = b.year * 12 + b.month;
      if (period < requestedPeriod) {
        const cur = latest.get(b.categoryId);
        if (!cur || period > cur.period) {
          latest.set(b.categoryId, { period, amount: b.amount, isDeleted: this.deletedBudgetIds.has(b.id) });
        }
      }
    }
    return Array.from(latest.entries())
      .filter(([categoryId, { isDeleted }]) => !isDeleted && !existingIds.has(categoryId))
      .map(([categoryId, { amount }]) => ({ categoryId, amount }));
  }
  async updateBudget(input: UpdateBudgetInput): Promise<Budget> {
    const idx = this.budgets.findIndex((b) => b.id === input.id && !this.deletedBudgetIds.has(b.id));
    if (idx === -1) throw new Error(`Budget ${input.id} not found`);
    this.budgets[idx] = { ...this.budgets[idx], ...input, updatedAt: Date.now() };
    return this.budgets[idx];
  }
  async deleteBudget(id: string): Promise<void> {
    const b = this.budgets.find((b) => b.id === id && !this.deletedBudgetIds.has(b.id));
    if (!b) throw new Error(`Budget ${id} not found`);
    this.deletedBudgetIds.add(id);
    // Cascade: soft-delete all future active budgets for the same category
    const deletedPeriod = b.year * 12 + b.month;
    for (const other of this.budgets) {
      if (other.categoryId === b.categoryId && !this.deletedBudgetIds.has(other.id) && (other.year * 12 + other.month) > deletedPeriod) {
        this.deletedBudgetIds.add(other.id);
      }
    }
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
      this.budgets = [];
      this.deletedBudgetIds = new Set();
      this.recurringTransactions = [];
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
    upsert(this.budgets, data.budgets);
    upsert(this.recurringTransactions, data.recurringTransactions);
    for (const b of data.deletedBudgets ?? []) {
      const idx = this.budgets.findIndex((x) => x.id === b.id);
      if (idx >= 0) this.budgets[idx] = b;
      else this.budgets.push(b);
      this.deletedBudgetIds.add(b.id);
    }
    Object.assign(this.settings, data.settings ?? {});
  }

  // Recurring Transactions
  async createRecurringTransaction(input: CreateRecurringTransactionInput): Promise<RecurringTransaction> {
    const now = Date.now();
    const rt: RecurringTransaction = {
      id: `rt-${this.idCounter++}`,
      type: input.type, amount: input.amount, currency: input.currency ?? 'USD',
      accountId: input.accountId, toAccountId: input.toAccountId, categoryId: input.categoryId,
      notes: input.notes, frequency: input.frequency, startDate: input.startDate,
      endDate: input.endDate, lastGeneratedDate: undefined, isActive: true,
      createdAt: now, updatedAt: now,
    };
    this.recurringTransactions.push(rt);
    return rt;
  }
  async getRecurringTransactionById(id: string): Promise<RecurringTransaction | null> {
    return this.recurringTransactions.find((r) => r.id === id) ?? null;
  }
  async getRecurringTransactions(activeOnly = false): Promise<RecurringTransaction[]> {
    return activeOnly ? this.recurringTransactions.filter((r) => r.isActive) : [...this.recurringTransactions];
  }
  async updateRecurringTransaction(input: UpdateRecurringTransactionInput): Promise<RecurringTransaction> {
    const idx = this.recurringTransactions.findIndex((r) => r.id === input.id);
    if (idx === -1) throw new Error(`RecurringTransaction ${input.id} not found`);
    const existing = this.recurringTransactions[idx];
    this.recurringTransactions[idx] = {
      ...existing,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...('endDate' in input && { endDate: input.endDate ?? undefined }),
      ...(input.notes !== undefined && { notes: input.notes ?? undefined }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...('lastGeneratedDate' in input && { lastGeneratedDate: input.lastGeneratedDate ?? undefined }),
      updatedAt: Date.now(),
    };
    return this.recurringTransactions[idx];
  }
  async deleteRecurringTransaction(id: string): Promise<void> {
    this.recurringTransactions = this.recurringTransactions.filter((r) => r.id !== id);
  }
  async getTransactionsByRecurringId(recurringId: string): Promise<Transaction[]> {
    return this.transactions.filter((t) => t.recurringTransactionId === recurringId);
  }

  // Lifecycle / migrations (stubs)
  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async getCurrentSchemaVersion(): Promise<number> { return 6; }
  async runMigrations(): Promise<void> {}
  async rollbackMigration(): Promise<void> {}
}
