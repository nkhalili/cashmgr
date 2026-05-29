import type {
  DatabaseAdapter,
  BulkUpsertData,
  Account,
  Category,
  Transaction,
  Currency,
  CreateAccountInput,
  CreateCategoryInput,
  CreateCurrencyInput,
  CreateTransactionInput,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  DashboardFilter,
  CategoryAggregation,
  DashboardSummary,
} from '@cashmgr/core';

export class MockDatabaseAdapter implements DatabaseAdapter {
  private accounts: Account[] = [];
  private categories: Category[] = [];
  private transactions: Transaction[] = [];
  private currencies: Currency[] = [];
  private idCounter = 1;

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

  async getCategories(activeOnly = true): Promise<Category[]> {
    let result = [...this.categories];
    if (activeOnly) result = result.filter(c => c.isActive !== false);
    return result;
  }

  async getCategoriesByType(type: 'income' | 'expense', activeOnly = true): Promise<Category[]> {
    let result = this.categories.filter(c => c.type === type);
    if (activeOnly) result = result.filter(c => c.isActive !== false);
    return result;
  }

  async getTopLevelCategories(activeOnly = true): Promise<Category[]> {
    let result = this.categories.filter(c => !c.parentId);
    if (activeOnly) result = result.filter(c => c.isActive !== false);
    return result;
  }

  async getSubcategories(parentId: string, activeOnly = true): Promise<Category[]> {
    let result = this.categories.filter(c => c.parentId === parentId);
    if (activeOnly) result = result.filter(c => c.isActive !== false);
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

  async getTransactions(filters?: any): Promise<Transaction[]> {
    let result = [...this.transactions];
    if (filters?.type) result = result.filter(t => t.type === filters.type);
    if (filters?.accountId) result = result.filter(t => t.accountId === filters.accountId || t.toAccountId === filters.accountId);
    if (filters?.categoryId) result = result.filter(t => t.categoryId === filters.categoryId);
    if (filters?.dateRange?.startDate) result = result.filter(t => t.date >= filters.dateRange.startDate);
    if (filters?.dateRange?.endDate) result = result.filter(t => t.date <= filters.dateRange.endDate);
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

  async getTransactionAggregateByCategory(filters?: any): Promise<CategoryAggregation[]> {
    const transactions = await this.getTransactions(filters);
    const categoryTotals = new Map<string, { categoryId: string; total: number; count: number }>();

    for (const tx of transactions) {
      if (!tx.categoryId) continue;
      const existing = categoryTotals.get(tx.categoryId);
      if (existing) {
        existing.total += tx.amount;
        existing.count += 1;
      } else {
        categoryTotals.set(tx.categoryId, { categoryId: tx.categoryId, total: tx.amount, count: 1 });
      }
    }

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
          percentage: 0,
        });
      }
    }
    return result;
  }

  async getCategoryBreakdown(_filter: DashboardFilter): Promise<CategoryAggregation[]> {
    return [];
  }

  async getDashboardSummary(_filter: DashboardFilter): Promise<DashboardSummary> {
    return { totalIncome: 0, totalExpenses: 0, netBalance: 0 };
  }

  async getCurrencies(activeOnly = false): Promise<Currency[]> {
    let result = [...this.currencies];
    if (activeOnly) result = result.filter(c => c.isActive !== false);
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

  private settings: Record<string, string> = {};
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
    for (const a of data.accounts ?? []) {
      const idx = this.accounts.findIndex(x => x.id === a.id);
      if (idx >= 0) this.accounts[idx] = a; else this.accounts.push(a);
    }
    for (const c of data.categories ?? []) {
      const idx = this.categories.findIndex(x => x.id === c.id);
      if (idx >= 0) this.categories[idx] = c; else this.categories.push(c);
    }
    for (const c of data.currencies ?? []) {
      const idx = this.currencies.findIndex(x => x.id === c.id);
      if (idx >= 0) this.currencies[idx] = c; else this.currencies.push(c);
    }
    for (const t of data.transactions ?? []) {
      const idx = this.transactions.findIndex(x => x.id === t.id);
      if (idx >= 0) this.transactions[idx] = t; else this.transactions.push(t);
    }
    Object.assign(this.settings, data.settings ?? {});
  }

  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async getCurrentSchemaVersion(): Promise<number> { return 4; }
  async runMigrations(): Promise<void> {}
  async rollbackMigration(): Promise<void> {}

  reset(): void {
    this.accounts = [];
    this.categories = [];
    this.transactions = [];
    this.currencies = [];
    this.idCounter = 1;
  }
}
