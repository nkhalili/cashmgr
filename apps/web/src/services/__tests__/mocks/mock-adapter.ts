/**
 * Mock DatabaseAdapter for Service Testing
 *
 * Provides in-memory implementation of DatabaseAdapter interface
 * for testing service layer without real database.
 */

import type {
  DatabaseAdapter,
  BulkUpsertData,
  Account,
  Category,
  Transaction,
  Currency,
  Budget,
  BudgetWithProgress,
  RecurringTransaction,
  CreateAccountInput,
  CreateBudgetInput,
  CreateCategoryInput,
  CreateCurrencyInput,
  CreateTransactionInput,
  UpdateAccountInput,
  UpdateBudgetInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
  DashboardFilter,
  CategoryAggregation,
  DashboardSummary,
} from '@cashmgr/core';

export class MockDatabaseAdapter implements DatabaseAdapter {
  private accounts: Account[] = [];
  private categories: Category[] = [];
  private transactions: Transaction[] = [];
  private currencies: Currency[] = [];
  private recurringTransactions: RecurringTransaction[] = [];
  private idCounter = 1;

  // Accounts
  async getAccounts(): Promise<Account[]> {
    return [...this.accounts];
  }

  async getAccountById(id: string): Promise<Account | null> {
    return this.accounts.find(a => a.id === id) || null;
  }

  async createAccount(input: CreateAccountInput): Promise<Account> {
    const now = Date.now();
    const account: Account = {
      id: `acc-${this.idCounter++}`,
      name: input.name,
      type: input.type,
      currency: input.currency || 'USD',
      initialBalance: input.initialBalance || 0,
      balance: input.initialBalance || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.push(account);
    return account;
  }

  async updateAccount(input: UpdateAccountInput): Promise<Account> {
    const index = this.accounts.findIndex(a => a.id === input.id);
    if (index === -1) throw new Error(`Account ${input.id} not found`);

    const account = this.accounts[index];
    this.accounts[index] = {
      ...account,
      name: input.name !== undefined ? input.name : account.name,
      type: input.type !== undefined ? input.type : account.type,
      currency: input.currency !== undefined ? input.currency : account.currency,
      balance: input.balance !== undefined ? input.balance : account.balance,
      updatedAt: Date.now(),
    };
    return this.accounts[index];
  }

  async deleteAccount(id: string): Promise<void> {
    const index = this.accounts.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Account ${id} not found`);
    this.accounts.splice(index, 1);
  }

  // Categories
  async getCategories(activeOnly = true): Promise<Category[]> {
    let result = [...this.categories];
    if (activeOnly) {
      result = result.filter(c => c.isActive !== false);
    }
    return result;
  }

  async getCategoriesByType(type: 'income' | 'expense', activeOnly = true): Promise<Category[]> {
    let result = this.categories.filter(c => c.type === type);
    if (activeOnly) {
      result = result.filter(c => c.isActive !== false);
    }
    return result;
  }

  async getTopLevelCategories(activeOnly = true): Promise<Category[]> {
    let result = this.categories.filter(c => !c.parentId);
    if (activeOnly) {
      result = result.filter(c => c.isActive !== false);
    }
    return result;
  }

  async getSubcategories(parentId: string, activeOnly = true): Promise<Category[]> {
    let result = this.categories.filter(c => c.parentId === parentId);
    if (activeOnly) {
      result = result.filter(c => c.isActive !== false);
    }
    return result;
  }

  async hasSubcategories(id: string): Promise<boolean> {
    return this.categories.some(c => c.parentId === id && c.isActive !== false);
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.categories.find(c => c.id === id) || null;
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const now = Date.now();
    const category: Category = {
      id: `cat-${this.idCounter++}`,
      name: input.name,
      type: input.type,
      icon: input.icon || undefined,
      color: input.color || undefined,
      parentId: input.parentId || undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.push(category);
    return category;
  }

  async updateCategory(input: UpdateCategoryInput): Promise<Category> {
    const index = this.categories.findIndex(c => c.id === input.id);
    if (index === -1) throw new Error(`Category ${input.id} not found`);

    const category = this.categories[index];
    this.categories[index] = {
      ...category,
      name: input.name !== undefined ? input.name : category.name,
      type: input.type !== undefined ? input.type : category.type,
      icon: input.icon !== undefined ? input.icon : category.icon,
      color: input.color !== undefined ? input.color : category.color,
      parentId: input.parentId !== undefined ? (input.parentId === null ? undefined : input.parentId) : category.parentId,
      isActive: input.isActive !== undefined ? input.isActive : category.isActive,
      updatedAt: Date.now(),
    };
    return this.categories[index];
  }

  async deleteCategory(id: string): Promise<void> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error(`Category ${id} not found`);
    this.categories.splice(index, 1);
  }

  // Transactions
  async getTransactions(filters?: any): Promise<Transaction[]> {
    let result = [...this.transactions];

    if (filters?.type) {
      result = result.filter(t => t.type === filters.type);
    }
    if (filters?.accountId) {
      result = result.filter(t => t.accountId === filters.accountId || t.toAccountId === filters.accountId);
    }
    if (filters?.categoryId) {
      result = result.filter(t => t.categoryId === filters.categoryId);
    }
    if (filters?.dateRange?.startDate) {
      result = result.filter(t => t.date >= filters.dateRange.startDate);
    }
    if (filters?.dateRange?.endDate) {
      result = result.filter(t => t.date <= filters.dateRange.endDate);
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    return this.transactions.find(t => t.id === id) || null;
  }

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const now = Date.now();
    const transaction: Transaction = {
      id: `txn-${this.idCounter++}`,
      type: input.type,
      amount: input.amount,
      currency: input.currency || 'USD',
      date: input.date,
      notes: input.notes || '',
      accountId: input.accountId,
      toAccountId: input.toAccountId || undefined,
      categoryId: input.categoryId || undefined,
      recurringTransactionId: input.recurringTransactionId || undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.push(transaction);
    return transaction;
  }

  async updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
    const index = this.transactions.findIndex(t => t.id === input.id);
    if (index === -1) throw new Error(`Transaction ${input.id} not found`);

    const transaction = this.transactions[index];
    this.transactions[index] = {
      ...transaction,
      type: input.type !== undefined ? input.type : transaction.type,
      amount: input.amount !== undefined ? input.amount : transaction.amount,
      currency: input.currency !== undefined ? input.currency : transaction.currency,
      date: input.date !== undefined ? input.date : transaction.date,
      notes: input.notes !== undefined ? input.notes : transaction.notes,
      accountId: input.accountId !== undefined ? input.accountId : transaction.accountId,
      toAccountId: input.toAccountId !== undefined ? input.toAccountId : transaction.toAccountId,
      categoryId: input.categoryId !== undefined ? input.categoryId : transaction.categoryId,
      updatedAt: Date.now(),
    };
    return this.transactions[index];
  }

  async deleteTransaction(id: string): Promise<void> {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Transaction ${id} not found`);
    this.transactions.splice(index, 1);
  }

  // Dashboard
  async getTransactionAggregateByCategory(filters?: any): Promise<CategoryAggregation[]> {
    // Get filtered transactions
    const transactions = await this.getTransactions(filters);

    // Group by category
    const categoryTotals = new Map<string, { categoryId: string; total: number; count: number }>();

    for (const tx of transactions) {
      if (!tx.categoryId) continue;

      const existing = categoryTotals.get(tx.categoryId);
      if (existing) {
        existing.total += tx.amount;
        existing.count += 1;
      } else {
        categoryTotals.set(tx.categoryId, {
          categoryId: tx.categoryId,
          total: tx.amount,
          count: 1,
        });
      }
    }

    // Convert to array and add category info
    const result: CategoryAggregation[] = [];
    for (const [categoryId, data] of categoryTotals.entries()) {
      const category = await this.getCategoryById(categoryId);
      if (category) {
        result.push({
          categoryId,
          categoryName: category.name,
          categoryIcon: category.icon || null,
          categoryColor: category.color || null,
          total: data.total,
          count: data.count,
          percentage: 0, // Will be calculated by service
        });
      }
    }

    return result;
  }

  async getCategoryBreakdown(_filter: DashboardFilter): Promise<CategoryAggregation[]> {
    // Simple mock implementation
    return [];
  }

  async getDashboardSummary(_filter: DashboardFilter): Promise<DashboardSummary> {
    // Simple mock implementation
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
    };
  }

  // Currencies
  async getCurrencies(activeOnly = false): Promise<Currency[]> {
    let result = [...this.currencies];
    if (activeOnly) {
      result = result.filter(c => c.isActive !== false);
    }
    return result;
  }

  async getCurrencyById(id: string): Promise<Currency | null> {
    return this.currencies.find(c => c.id === id) || null;
  }

  async getPrimaryCurrency(): Promise<Currency | null> {
    return this.currencies.find(c => c.isPrimary === true) || null;
  }

  async createCurrency(input: CreateCurrencyInput): Promise<Currency> {
    const now = Date.now();
    const currency: Currency = {
      id: input.id,
      name: input.name,
      symbol: input.symbol,
      exchangeRate: input.exchangeRate ?? 1.0,
      isPrimary: input.isPrimary ?? false,
      isActive: true,
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    };
    this.currencies.push(currency);
    return currency;
  }

  async updateCurrency(input: { id: string; name?: string; symbol?: string; exchangeRate?: number; isPrimary?: boolean; isActive?: boolean }): Promise<Currency> {
    const index = this.currencies.findIndex(c => c.id === input.id);
    if (index === -1) throw new Error(`Currency ${input.id} not found`);

    const currency = this.currencies[index];
    this.currencies[index] = {
      ...currency,
      name: input.name !== undefined ? input.name : currency.name,
      symbol: input.symbol !== undefined ? input.symbol : currency.symbol,
      exchangeRate: input.exchangeRate !== undefined ? input.exchangeRate : currency.exchangeRate,
      isPrimary: input.isPrimary !== undefined ? input.isPrimary : currency.isPrimary,
      isActive: input.isActive !== undefined ? input.isActive : currency.isActive,
      updatedAt: Date.now(),
    };
    return this.currencies[index];
  }

  async deleteCurrency(id: string): Promise<void> {
    const index = this.currencies.findIndex(c => c.id === id);
    if (index === -1) throw new Error(`Currency ${id} not found`);
    this.currencies.splice(index, 1);
  }

  // Settings
  private settings: Record<string, string> = {};

  async getSetting(key: string): Promise<string | null> {
    return this.settings[key] ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.settings[key] = value;
  }

  async deleteSetting(key: string): Promise<void> {
    delete this.settings[key];
  }

  async getAllSettings(): Promise<Record<string, string>> {
    return { ...this.settings };
  }

  async bulkUpsert(data: BulkUpsertData): Promise<void> {
    if (data.clearExisting) {
      this.accounts = [];
      this.categories = [];
      this.currencies = [];
      this.transactions = [];
      this.budgets = [];
      this.deletedBudgetIds = new Set();
      this.settings = {};
    }
    for (const a of data.accounts ?? []) {
      const idx = this.accounts.findIndex((x) => x.id === a.id);
      if (idx >= 0) this.accounts[idx] = a;
      else this.accounts.push(a);
    }
    for (const c of data.categories ?? []) {
      const idx = this.categories.findIndex((x) => x.id === c.id);
      if (idx >= 0) this.categories[idx] = c;
      else this.categories.push(c);
    }
    for (const c of data.currencies ?? []) {
      const idx = this.currencies.findIndex((x) => x.id === c.id);
      if (idx >= 0) this.currencies[idx] = c;
      else this.currencies.push(c);
    }
    for (const t of data.transactions ?? []) {
      const idx = this.transactions.findIndex((x) => x.id === t.id);
      if (idx >= 0) this.transactions[idx] = t;
      else this.transactions.push(t);
    }
    for (const b of data.budgets ?? []) {
      const idx = this.budgets.findIndex((x) => x.id === b.id);
      if (idx >= 0) this.budgets[idx] = b;
      else this.budgets.push(b);
    }
    for (const b of data.deletedBudgets ?? []) {
      const idx = this.budgets.findIndex((x) => x.id === b.id);
      if (idx >= 0) this.budgets[idx] = b;
      else this.budgets.push(b);
      this.deletedBudgetIds.add(b.id);
    }
    Object.assign(this.settings, data.settings ?? {});
  }

  // Budgets (F-063)
  private budgets: Budget[] = [];
  private deletedBudgetIds = new Set<string>();

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
    const budget: Budget = { id: `bud-${this.idCounter++}`, ...input, createdAt: now, updatedAt: now };
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
        return {
          ...b,
          categoryName: cat?.name ?? '',
          categoryColor: cat?.color,
          categoryIcon: cat?.icon,
          spent: 0,
          remaining: b.amount,
          percentage: 0,
        };
      });
  }
  async getBudgetDefaults(month: number, year: number): Promise<{ categoryId: string; amount: number }[]> {
    const requestedPeriod = year * 12 + month;
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
    const deletedPeriod = b.year * 12 + b.month;
    for (const other of this.budgets) {
      if (other.categoryId === b.categoryId && !this.deletedBudgetIds.has(other.id) && (other.year * 12 + other.month) > deletedPeriod) {
        this.deletedBudgetIds.add(other.id);
      }
    }
  }

  // Recurring Transactions
  async createRecurringTransaction(input: CreateRecurringTransactionInput): Promise<RecurringTransaction> {
    const now = Date.now();
    const rt: RecurringTransaction = {
      id: `rt-${this.idCounter++}`,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      accountId: input.accountId,
      toAccountId: input.toAccountId,
      categoryId: input.categoryId,
      notes: input.notes,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate ?? undefined,
      lastGeneratedDate: undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.recurringTransactions.push(rt);
    return rt;
  }

  async getRecurringTransactionById(id: string): Promise<RecurringTransaction | null> {
    return this.recurringTransactions.find((rt) => rt.id === id) ?? null;
  }

  async getRecurringTransactions(activeOnly = false): Promise<RecurringTransaction[]> {
    if (activeOnly) return this.recurringTransactions.filter((rt) => rt.isActive);
    return [...this.recurringTransactions];
  }

  async updateRecurringTransaction(input: UpdateRecurringTransactionInput): Promise<RecurringTransaction> {
    const idx = this.recurringTransactions.findIndex((rt) => rt.id === input.id);
    if (idx === -1) throw new Error(`RecurringTransaction ${input.id} not found`);
    const existing = this.recurringTransactions[idx];
    this.recurringTransactions[idx] = {
      ...existing,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...('endDate' in input && { endDate: input.endDate ?? undefined }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...('lastGeneratedDate' in input && { lastGeneratedDate: input.lastGeneratedDate ?? undefined }),
      updatedAt: Date.now(),
    };
    return this.recurringTransactions[idx];
  }

  async deleteRecurringTransaction(id: string): Promise<void> {
    const idx = this.recurringTransactions.findIndex((rt) => rt.id === id);
    if (idx === -1) throw new Error(`RecurringTransaction ${id} not found`);
    this.recurringTransactions.splice(idx, 1);
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

  // Test helpers
  reset(): void {
    this.accounts = [];
    this.categories = [];
    this.transactions = [];
    this.currencies = [];
    this.recurringTransactions = [];
    this.idCounter = 1;
  }

  seedAccounts(accounts: Account[]): void {
    this.accounts.push(...accounts);
  }

  seedCategories(categories: Category[]): void {
    this.categories.push(...categories);
  }

  seedTransactions(transactions: Transaction[]): void {
    this.transactions.push(...transactions);
  }

  seedCurrencies(currencies: Currency[]): void {
    this.currencies.push(...currencies);
  }
}
