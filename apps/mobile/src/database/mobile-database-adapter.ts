import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  DatabaseAdapter,
  BulkUpsertData,
  Account,
  Currency,
  CreateAccountInput,
  UpdateAccountInput,
  CreateCurrencyInput,
  UpdateCurrencyInput,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  Category,
  CategoryType,
  CategoryAggregation,
  CreateCategoryInput,
  UpdateCategoryInput,
  Budget,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetWithProgress,
  RecurringTransaction,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
  FilterParams,
  PaginationParams,
  DEFAULT_CURRENCY,
  getMonthStartDateString,
  getMonthEndDateString,
} from '@cashmgr/core';
import { migrations, type Migration } from '@cashmgr/db';

/**
 * F-040: Mobile Database Adapter
 * Implements DatabaseAdapter interface using expo-sqlite for React Native
 */
export class MobileDatabaseAdapter implements DatabaseAdapter {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    // Open database
    this.db = await SQLite.openDatabaseAsync('cashmgr.db');

    // Create migrations table if it doesn't exist
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    // Run migrations
    for (const migration of migrations) {
      await this.runMigration(migration);
    }
  }

  private async runMigration(migration: Migration): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if migration already applied
    const result = await this.db.getAllAsync<{ version: number }>(
      'SELECT version FROM migrations WHERE version = ?',
      [migration.version]
    );

    if (result.length > 0) {
      return; // Migration already applied
    }

    // Run migration
    for (const sql of migration.up) {
      await this.db.execAsync(sql);
    }

    // Record migration
    await this.db.runAsync(
      'INSERT INTO migrations (version, description, applied_at) VALUES (?, ?, ?)',
      [migration.version, migration.description, Date.now()]
    );
  }

  // Account Operations
  async createAccount(input: CreateAccountInput): Promise<Account> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Crypto.randomUUID();
    const now = Date.now();
    const currency = input.currency || DEFAULT_CURRENCY;

    await this.db.runAsync(
      `INSERT INTO accounts (id, name, type, balance, initial_balance, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.type, input.initialBalance, input.initialBalance, currency, now, now]
    );

    const account = await this.getAccountById(id);
    if (!account) throw new Error('Failed to create account');
    return account;
  }

  async getAccounts(): Promise<Account[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      balance: number;
      initial_balance: number;
      currency: string;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM accounts ORDER BY created_at DESC');

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as Account['type'],
      balance: row.balance,
      initialBalance: row.initial_balance,
      currency: row.currency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getAccountById(id: string): Promise<Account | null> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      balance: number;
      initial_balance: number;
      currency: string;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM accounts WHERE id = ?', [id]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      type: row.type as Account['type'],
      balance: row.balance,
      initialBalance: row.initial_balance,
      currency: row.currency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateAccount(input: UpdateAccountInput): Promise<Account> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }
    if (input.balance !== undefined) {
      updates.push('balance = ?');
      values.push(input.balance);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(input.id);

    await this.db.runAsync(
      `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`,
      values as any[]
    );

    const account = await this.getAccountById(input.id);
    if (!account) throw new Error('Account not found');
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  }

  // Currency Operations
  async createCurrency(input: CreateCurrencyInput): Promise<Currency> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    await this.db.runAsync(
      `INSERT INTO currencies (id, name, symbol, is_primary, exchange_rate, last_updated, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.name,
        input.symbol,
        input.isPrimary ? 1 : 0,
        input.exchangeRate,
        now,
        1,
        now,
        now,
      ]
    );

    const currency = await this.getCurrencyById(input.id);
    if (!currency) throw new Error('Failed to create currency');
    return currency;
  }

  async getCurrencies(activeOnly = false): Promise<Currency[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = activeOnly
      ? 'SELECT * FROM currencies WHERE is_active = 1 ORDER BY is_primary DESC, name ASC'
      : 'SELECT * FROM currencies ORDER BY is_primary DESC, name ASC';

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      symbol: string;
      is_primary: number;
      exchange_rate: number;
      last_updated: number;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>(sql);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      isPrimary: row.is_primary === 1,
      exchangeRate: row.exchange_rate,
      lastUpdated: row.last_updated,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getCurrencyById(id: string): Promise<Currency | null> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      symbol: string;
      is_primary: number;
      exchange_rate: number;
      last_updated: number;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM currencies WHERE id = ?', [id]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      isPrimary: row.is_primary === 1,
      exchangeRate: row.exchange_rate,
      lastUpdated: row.last_updated,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getPrimaryCurrency(): Promise<Currency | null> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      symbol: string;
      is_primary: number;
      exchange_rate: number;
      last_updated: number;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM currencies WHERE is_primary = 1 LIMIT 1');

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      isPrimary: row.is_primary === 1,
      exchangeRate: row.exchange_rate,
      lastUpdated: row.last_updated,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateCurrency(input: UpdateCurrencyInput): Promise<Currency> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.symbol !== undefined) {
      updates.push('symbol = ?');
      values.push(input.symbol);
    }
    if (input.exchangeRate !== undefined) {
      updates.push('exchange_rate = ?');
      values.push(input.exchangeRate);
      updates.push('last_updated = ?');
      values.push(Date.now());
    }
    if (input.isPrimary !== undefined) {
      updates.push('is_primary = ?');
      values.push(input.isPrimary ? 1 : 0);
    }
    if (input.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(input.isActive ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(input.id);

    await this.db.runAsync(
      `UPDATE currencies SET ${updates.join(', ')} WHERE id = ?`,
      values as any[]
    );

    const currency = await this.getCurrencyById(input.id);
    if (!currency) throw new Error('Currency not found');
    return currency;
  }

  async deleteCurrency(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM currencies WHERE id = ?', [id]);
  }

  async setPrimaryCurrency(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Use transaction to ensure atomicity
    await this.db.execAsync('BEGIN TRANSACTION');

    try {
      // Unset all primary flags
      await this.db.runAsync('UPDATE currencies SET is_primary = 0');

      // Set new primary and exchange rate to 1.0
      const result = await this.db.runAsync(
        'UPDATE currencies SET is_primary = 1, exchange_rate = 1.0, last_updated = ?, updated_at = ? WHERE id = ?',
        [Date.now(), Date.now(), id]
      );

      if (result.changes === 0) {
        throw new Error(`Currency not found for id: ${id}`);
      }

      await this.db.execAsync('COMMIT');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  // Transaction Operations (F-002)
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Crypto.randomUUID();
    const now = Date.now();

    await this.db.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, to_account_id, notes, recurring_transaction_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.type,
        input.amount,
        input.currency ?? 'USD',
        input.date,
        input.accountId,
        input.categoryId ?? null,
        input.toAccountId ?? null,
        input.notes ?? null,
        input.recurringTransactionId ?? null,
        now,
        now,
      ]
    );

    const transaction = await this.getTransactionById(id);
    if (!transaction) throw new Error('Failed to create transaction');
    return transaction;
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      type: string;
      amount: number;
      currency: string;
      date: string; // B-001: YYYY-MM-DD format
      account_id: string;
      category_id: string | null; // Null for transfers
      to_account_id: string | null;
      notes: string | null;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM transactions WHERE id = ?', [id]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return this.mapRowToTransaction(row);
  }

  async getTransactions(filter?: FilterParams, pagination?: PaginationParams): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: (string | number)[] = [];

    // Apply filters
    if (filter?.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }
    if (filter?.accountId) {
      sql += ' AND (account_id = ? OR to_account_id = ?)';
      params.push(filter.accountId, filter.accountId);
    }
    if (filter?.categoryId) {
      sql += ' AND category_id = ?';
      params.push(filter.categoryId);
    }
    if (filter?.dateRange) {
      if (filter.dateRange.startDate) {
        sql += ' AND date >= ?';
        params.push(filter.dateRange.startDate);
      }
      if (filter.dateRange.endDate) {
        sql += ' AND date <= ?';
        params.push(filter.dateRange.endDate);
      }
    }

    // Order by date descending (most recent first)
    sql += ' ORDER BY date DESC, created_at DESC';

    // Apply pagination
    if (pagination?.limit) {
      sql += ' LIMIT ?';
      params.push(pagination.limit);
      if (pagination.offset) {
        sql += ' OFFSET ?';
        params.push(pagination.offset);
      }
    }

    const rows = await this.db.getAllAsync<{
      id: string;
      type: string;
      amount: number;
      currency: string;
      description: string;
      date: string; // B-001: YYYY-MM-DD format
      account_id: string;
      category_id: string;
      to_account_id: string | null;
      notes: string | null;
      created_at: number;
      updated_at: number;
    }>(sql, params);

    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }
    if (input.amount !== undefined) {
      updates.push('amount = ?');
      values.push(input.amount);
    }
    if (input.currency !== undefined) {
      updates.push('currency = ?');
      values.push(input.currency);
    }
    if (input.date !== undefined) {
      updates.push('date = ?');
      values.push(input.date);
    }
    if (input.accountId !== undefined) {
      updates.push('account_id = ?');
      values.push(input.accountId);
    }
    if (input.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(input.categoryId ?? null); // Null for transfers
    }
    if (input.toAccountId !== undefined) {
      updates.push('to_account_id = ?');
      values.push(input.toAccountId ?? null);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes ?? null);
    }
    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(input.id);

    await this.db.runAsync(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
      values as any[]
    );

    const transaction = await this.getTransactionById(input.id);
    if (!transaction) throw new Error('Transaction not found');
    return transaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  // F-004: Aggregate transactions by category for dashboard
  async getTransactionAggregateByCategory(filter: FilterParams): Promise<CategoryAggregation[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = `
      SELECT
        c.id as categoryId,
        c.name as categoryName,
        c.icon as categoryIcon,
        c.color as categoryColor,
        SUM(t.amount) as total,
        COUNT(t.id) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filter.type) {
      sql += ' AND t.type = ?';
      params.push(filter.type);
    }

    if (filter.dateRange) {
      if (filter.dateRange.startDate) {
        sql += ' AND t.date >= ?';
        params.push(filter.dateRange.startDate);
      }
      if (filter.dateRange.endDate) {
        sql += ' AND t.date <= ?';
        params.push(filter.dateRange.endDate);
      }
    }

    if (filter.accountId) {
      sql += ' AND t.account_id = ?';
      params.push(filter.accountId);
    }

    sql += ' GROUP BY c.id, c.name, c.icon, c.color ORDER BY total DESC';

    const rows = await this.db.getAllAsync<{
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      total: number;
      count: number;
    }>(sql, params);

    return rows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
      categoryColor: row.categoryColor,
      total: row.total,
      count: row.count,
    }));
  }

  private mapRowToTransaction(row: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    date: string; // B-001: YYYY-MM-DD format
    account_id: string;
    category_id: string | null; // Null for transfers
    to_account_id: string | null;
    notes: string | null;
    recurring_transaction_id?: string | null;
    created_at: number;
    updated_at: number;
  }): Transaction {
    return {
      id: row.id,
      type: row.type as Transaction['type'],
      amount: row.amount,
      currency: row.currency,
      date: row.date,
      accountId: row.account_id,
      categoryId: row.category_id ?? undefined,
      toAccountId: row.to_account_id ?? undefined,
      notes: row.notes ?? undefined,
      recurringTransactionId: row.recurring_transaction_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Category Operations (F-003)
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Crypto.randomUUID();
    const now = Date.now();

    await this.db.runAsync(
      `INSERT INTO categories (id, name, type, color, icon, parent_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.type,
        input.color ?? null,
        input.icon ?? null,
        input.parentId ?? null,
        1,
        now,
        now,
      ]
    );

    const category = await this.getCategoryById(id);
    if (!category) throw new Error('Failed to create category');
    return category;
  }

  async getCategoryById(id: string): Promise<Category | null> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      color: string | null;
      icon: string | null;
      parent_id: string | null;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM categories WHERE id = ?', [id]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      parentId: row.parent_id ?? undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getCategories(activeOnly = false): Promise<Category[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = activeOnly
      ? 'SELECT * FROM categories WHERE is_active = 1 ORDER BY parent_id NULLS FIRST, name ASC'
      : 'SELECT * FROM categories ORDER BY parent_id NULLS FIRST, name ASC';

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      color: string | null;
      icon: string | null;
      parent_id: string | null;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>(sql);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      parentId: row.parent_id ?? undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getCategoriesByType(type: CategoryType, activeOnly = false): Promise<Category[]> {
    if (!this.db) throw new Error('Database not initialized');

    const activeClause = activeOnly ? ' AND is_active = 1' : '';
    const sql = `SELECT * FROM categories WHERE type = ?${activeClause} ORDER BY parent_id NULLS FIRST, name ASC`;

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      color: string | null;
      icon: string | null;
      parent_id: string | null;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>(sql, [type]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      parentId: row.parent_id ?? undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getSubcategories(parentId: string, activeOnly = false): Promise<Category[]> {
    if (!this.db) throw new Error('Database not initialized');

    const activeClause = activeOnly ? ' AND is_active = 1' : '';
    const sql = `SELECT * FROM categories WHERE parent_id = ?${activeClause} ORDER BY name ASC`;

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      color: string | null;
      icon: string | null;
      parent_id: string | null;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>(sql, [parentId]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      parentId: row.parent_id ?? undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getTopLevelCategories(activeOnly = false): Promise<Category[]> {
    if (!this.db) throw new Error('Database not initialized');

    const activeClause = activeOnly ? ' AND is_active = 1' : '';
    const sql = `SELECT * FROM categories WHERE parent_id IS NULL${activeClause} ORDER BY type, name ASC`;

    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      color: string | null;
      icon: string | null;
      parent_id: string | null;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>(sql);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      parentId: row.parent_id ?? undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateCategory(input: UpdateCategoryInput): Promise<Category> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      values.push(input.color ?? null);
    }
    if (input.icon !== undefined) {
      updates.push('icon = ?');
      values.push(input.icon ?? null);
    }
    if (input.parentId !== undefined) {
      updates.push('parent_id = ?');
      values.push(input.parentId ?? null);
    }
    if (input.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(input.isActive ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(input.id);

    await this.db.runAsync(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      values as any[]
    );

    const category = await this.getCategoryById(input.id);
    if (!category) throw new Error('Category not found');
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Soft delete - set is_active to 0
    await this.db.runAsync(
      'UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
  }

  async hasSubcategories(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND is_active = 1',
      [id]
    );

    return (rows[0]?.count ?? 0) > 0;
  }

  // Budget Operations (F-063)
  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    // Reactivate a soft-deleted row if one exists for this (category, month, year)
    const tombstones = await this.db.getAllAsync<{ id: string }>(
      `SELECT id FROM budgets WHERE category_id = ? AND month = ? AND year = ? AND is_deleted = 1 LIMIT 1`,
      [input.categoryId, input.month, input.year]
    );

    if (tombstones.length > 0) {
      await this.db.runAsync(
        `UPDATE budgets SET amount = ?, is_deleted = 0, updated_at = ? WHERE id = ?`,
        [input.amount, now, tombstones[0].id]
      );
      const budget = await this.getBudgetById(tombstones[0].id);
      if (!budget) throw new Error('Failed to reactivate budget');
      await this.db.runAsync(
        `UPDATE budgets SET is_deleted = 0, amount = ?, updated_at = ?
         WHERE category_id = ? AND is_deleted = 1
           AND (year * 12 + month) > (? * 12 + ?)`,
        [input.amount, now, input.categoryId, input.year, input.month]
      );
      return budget;
    }

    const id = Crypto.randomUUID();

    await this.db.runAsync(
      `INSERT INTO budgets (id, category_id, amount, month, year, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, input.categoryId, input.amount, input.month, input.year, now, now]
    );

    await this.db.runAsync(
      `UPDATE budgets SET is_deleted = 0, amount = ?, updated_at = ?
       WHERE category_id = ? AND is_deleted = 1
         AND (year * 12 + month) > (? * 12 + ?)`,
      [input.amount, now, input.categoryId, input.year, input.month]
    );

    const budget = await this.getBudgetById(id);
    if (!budget) throw new Error('Failed to create budget');
    return budget;
  }

  async getAllBudgets(): Promise<Budget[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{
      id: string; category_id: string; amount: number;
      month: number; year: number; created_at: number; updated_at: number;
    }>(
      `SELECT id, category_id, amount, month, year, created_at, updated_at
       FROM budgets WHERE is_deleted = 0 ORDER BY year ASC, month ASC`
    );
    return rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getEffectiveTombstones(): Promise<Budget[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{
      id: string; category_id: string; amount: number;
      month: number; year: number; created_at: number; updated_at: number;
    }>(
      `SELECT id, category_id, amount, month, year, created_at, updated_at
       FROM budgets b
       WHERE b.is_deleted = 1
         AND (b.year * 12 + b.month) = (
           SELECT MAX(b2.year * 12 + b2.month)
           FROM budgets b2
           WHERE b2.category_id = b.category_id
         )`
    );
    return rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getBudgetById(id: string): Promise<Budget | null> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      category_id: string;
      amount: number;
      month: number;
      year: number;
      created_at: number;
      updated_at: number;
    }>('SELECT id, category_id, amount, month, year, created_at, updated_at FROM budgets WHERE id = ? AND is_deleted = 0', [id]);

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      categoryId: row.category_id,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getBudgets(month: number, year: number): Promise<Budget[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: string;
      category_id: string;
      amount: number;
      month: number;
      year: number;
      created_at: number;
      updated_at: number;
    }>(
      'SELECT id, category_id, amount, month, year, created_at, updated_at FROM budgets WHERE month = ? AND year = ? AND is_deleted = 0 ORDER BY created_at ASC',
      [month, year]
    );

    return rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getBudgetsWithProgress(month: number, year: number): Promise<BudgetWithProgress[]> {
    if (!this.db) throw new Error('Database not initialized');

    const startDate = getMonthStartDateString(year, month);
    const endDate = getMonthEndDateString(year, month);

    const rows = await this.db.getAllAsync<{
      id: string;
      category_id: string;
      amount: number;
      month: number;
      year: number;
      created_at: number;
      updated_at: number;
      category_name: string;
      category_color: string | null;
      category_icon: string | null;
      spent: number;
    }>(
      `SELECT
         b.id, b.category_id, b.amount, b.month, b.year, b.created_at, b.updated_at,
         c.name as category_name, c.color as category_color, c.icon as category_icon,
         COALESCE(SUM(t.amount), 0) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN transactions t
         ON t.type = 'expense'
         AND t.date >= ? AND t.date <= ?
         AND (
           t.category_id = b.category_id
           OR t.category_id IN (SELECT id FROM categories WHERE parent_id = b.category_id)
         )
       WHERE b.month = ? AND b.year = ? AND b.is_deleted = 0
       GROUP BY b.id
       ORDER BY c.name ASC`,
      [startDate, endDate, month, year]
    );

    return rows.map((row) => {
      const spent = row.spent;
      const remaining = row.amount - spent;
      const percentage = row.amount > 0 ? (spent / row.amount) * 100 : 0;
      return {
        id: row.id,
        categoryId: row.category_id,
        amount: row.amount,
        month: row.month,
        year: row.year,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        categoryName: row.category_name,
        categoryColor: row.category_color ?? undefined,
        categoryIcon: row.category_icon ?? undefined,
        spent,
        remaining,
        percentage,
      };
    });
  }

  async updateBudget(input: UpdateBudgetInput): Promise<Budget> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (input.amount !== undefined) {
      updates.push('amount = ?');
      values.push(input.amount);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(input.id);

    await this.db.runAsync(
      `UPDATE budgets SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`,
      values as any[]
    );

    const budget = await this.getBudgetById(input.id);
    if (!budget) throw new Error('Budget not found');
    return budget;
  }

  async deleteBudget(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    const rows = await this.db.getAllAsync<{ category_id: string; month: number; year: number }>(
      'SELECT category_id, month, year FROM budgets WHERE id = ? AND is_deleted = 0 LIMIT 1',
      [id]
    );
    if (rows.length === 0) throw new Error(`Budget not found for id: ${id}`);
    const { category_id, month, year } = rows[0];

    await this.db.runAsync(
      'UPDATE budgets SET is_deleted = 1, updated_at = ? WHERE id = ? AND is_deleted = 0',
      [now, id]
    );

    // Cascade: soft-delete all future active budgets for the same category
    await this.db.runAsync(
      `UPDATE budgets SET is_deleted = 1, updated_at = ?
       WHERE category_id = ? AND is_deleted = 0
         AND (year * 12 + month) > (? * 12 + ?)`,
      [now, category_id, year, month]
    );
  }

  async getBudgetDefaults(month: number, year: number): Promise<{ categoryId: string; amount: number }[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{ category_id: string; amount: number }>(
      `SELECT b.category_id, b.amount
       FROM budgets b
       WHERE b.is_deleted = 0
         AND (b.year * 12 + b.month) < (? * 12 + ?)
         AND NOT EXISTS (
           SELECT 1 FROM budgets ex
           WHERE ex.category_id = b.category_id
             AND ex.year = ? AND ex.month = ?
         )
         AND (b.year * 12 + b.month) = (
           SELECT MAX(b2.year * 12 + b2.month)
           FROM budgets b2
           WHERE b2.category_id = b.category_id
             AND (b2.year * 12 + b2.month) < (? * 12 + ?)
         )`,
      [year, month, year, month, year, month]
    );
    return rows.map((r) => ({ categoryId: r.category_id, amount: r.amount }));
  }

  // Settings Operations (F-040: Not implemented in MVP)
  async getSetting(_key: string): Promise<string | null> {
    throw new Error('Settings operations not yet implemented in mobile app');
  }

  async setSetting(_key: string, _value: string): Promise<void> {
    throw new Error('Settings operations not yet implemented in mobile app');
  }

  async deleteSetting(_key: string): Promise<void> {
    throw new Error('Settings operations not yet implemented in mobile app');
  }

  // F-062: Export/Import operations
  async getAllSettings(): Promise<Record<string, string>> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async bulkUpsert(data: BulkUpsertData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    if (data.clearExisting) {
      await this.db.execAsync('DELETE FROM transactions');
      await this.db.execAsync('DELETE FROM recurring_transactions');
      await this.db.execAsync('DELETE FROM budgets');
      await this.db.execAsync('DELETE FROM accounts');
      await this.db.execAsync('DELETE FROM categories');
      await this.db.execAsync('DELETE FROM currencies');
      await this.db.execAsync('DELETE FROM settings');
    }

    // Currencies first
    for (const currency of data.currencies ?? []) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO currencies
          (id, name, symbol, is_primary, exchange_rate, last_updated, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currency.id, currency.name, currency.symbol,
          currency.isPrimary ? 1 : 0, currency.exchangeRate,
          currency.lastUpdated, currency.isActive ? 1 : 0,
          currency.createdAt, currency.updatedAt,
        ]
      );
    }

    // Categories (parents before children)
    const sorted = [...(data.categories ?? [])].sort((a, b) => {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      return 0;
    });
    for (const cat of sorted) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO categories
          (id, name, type, color, icon, parent_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cat.id, cat.name, cat.type,
          cat.color ?? null, cat.icon ?? null, cat.parentId ?? null,
          cat.isActive ? 1 : 0, cat.createdAt, cat.updatedAt,
        ]
      );
    }

    // Accounts
    for (const account of data.accounts ?? []) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO accounts
          (id, name, type, balance, initial_balance, currency, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          account.id, account.name, account.type,
          account.balance, account.initialBalance, account.currency,
          account.createdAt, account.updatedAt,
        ]
      );
    }

    // Transactions
    for (const tx of data.transactions ?? []) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO transactions
          (id, type, amount, currency, date, account_id, category_id, to_account_id, notes, recurring_transaction_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tx.id, tx.type, tx.amount, tx.currency, tx.date,
          tx.accountId, tx.categoryId ?? null, tx.toAccountId ?? null,
          tx.notes ?? null, tx.recurringTransactionId ?? null,
          tx.createdAt, tx.updatedAt,
        ]
      );
    }

    // Budgets (categories must already exist)
    for (const budget of data.budgets ?? []) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO budgets
          (id, category_id, amount, month, year, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [budget.id, budget.categoryId, budget.amount, budget.month, budget.year, budget.createdAt, budget.updatedAt]
      );
    }

    // Restore effective tombstones
    for (const budget of data.deletedBudgets ?? []) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO budgets
          (id, category_id, amount, month, year, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [budget.id, budget.categoryId, budget.amount, budget.month, budget.year, budget.createdAt, budget.updatedAt]
      );
    }

    // Recurring transactions (accounts and categories must already exist)
    for (const rt of data.recurringTransactions ?? []) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO recurring_transactions
          (id, type, amount, currency, account_id, to_account_id, category_id, notes,
           frequency, start_date, end_date, last_generated_date, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rt.id, rt.type, rt.amount, rt.currency,
          rt.accountId, rt.toAccountId ?? null, rt.categoryId ?? null, rt.notes ?? null,
          rt.frequency, rt.startDate, rt.endDate ?? null, rt.lastGeneratedDate ?? null,
          rt.isActive ? 1 : 0, rt.createdAt, rt.updatedAt,
        ]
      );
    }

    // Settings
    const now = Date.now();
    for (const [key, value] of Object.entries(data.settings ?? {})) {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value as string, now]
      );
    }
  }

  // Recurring Transaction Operations
  async createRecurringTransaction(input: CreateRecurringTransactionInput): Promise<RecurringTransaction> {
    if (!this.db) throw new Error('Database not initialized');
    const id = Crypto.randomUUID();
    const now = Date.now();
    await this.db.runAsync(
      `INSERT INTO recurring_transactions
        (id, type, amount, currency, account_id, to_account_id, category_id, notes,
         frequency, start_date, end_date, last_generated_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id, input.type, input.amount, input.currency ?? 'USD',
        input.accountId, input.toAccountId ?? null, input.categoryId ?? null, input.notes ?? null,
        input.frequency, input.startDate, input.endDate ?? null, null,
        now, now,
      ]
    );
    const rows = await this.db.getAllAsync<{ id: string; type: string; amount: number; currency: string; account_id: string; to_account_id: string | null; category_id: string | null; notes: string | null; frequency: string; start_date: string; end_date: string | null; last_generated_date: string | null; is_active: number; created_at: number; updated_at: number }>(
      'SELECT * FROM recurring_transactions WHERE id = ?', [id]
    );
    return this.mapRowToRecurringTransaction(rows[0]);
  }

  async getRecurringTransactionById(id: string): Promise<RecurringTransaction | null> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{ id: string; type: string; amount: number; currency: string; account_id: string; to_account_id: string | null; category_id: string | null; notes: string | null; frequency: string; start_date: string; end_date: string | null; last_generated_date: string | null; is_active: number; created_at: number; updated_at: number }>(
      'SELECT * FROM recurring_transactions WHERE id = ?', [id]
    );
    return rows.length > 0 ? this.mapRowToRecurringTransaction(rows[0]) : null;
  }

  async getRecurringTransactions(activeOnly = false): Promise<RecurringTransaction[]> {
    if (!this.db) throw new Error('Database not initialized');
    const sql = activeOnly
      ? 'SELECT * FROM recurring_transactions WHERE is_active = 1 ORDER BY created_at ASC'
      : 'SELECT * FROM recurring_transactions ORDER BY created_at ASC';
    const rows = await this.db.getAllAsync<{ id: string; type: string; amount: number; currency: string; account_id: string; to_account_id: string | null; category_id: string | null; notes: string | null; frequency: string; start_date: string; end_date: string | null; last_generated_date: string | null; is_active: number; created_at: number; updated_at: number }>(sql);
    return rows.map((r) => this.mapRowToRecurringTransaction(r));
  }

  async updateRecurringTransaction(input: UpdateRecurringTransactionInput): Promise<RecurringTransaction> {
    if (!this.db) throw new Error('Database not initialized');
    const sets: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.type !== undefined) { sets.push('type = ?'); params.push(input.type); }
    if (input.amount !== undefined) { sets.push('amount = ?'); params.push(input.amount); }
    if (input.currency !== undefined) { sets.push('currency = ?'); params.push(input.currency); }
    if (input.accountId !== undefined) { sets.push('account_id = ?'); params.push(input.accountId); }
    if ('toAccountId' in input) { sets.push('to_account_id = ?'); params.push(input.toAccountId ?? null); }
    if ('categoryId' in input) { sets.push('category_id = ?'); params.push(input.categoryId ?? null); }
    if (input.frequency !== undefined) { sets.push('frequency = ?'); params.push(input.frequency); }
    if (input.startDate !== undefined) { sets.push('start_date = ?'); params.push(input.startDate); }
    if ('endDate' in input) { sets.push('end_date = ?'); params.push(input.endDate ?? null); }
    if ('notes' in input) { sets.push('notes = ?'); params.push(input.notes ?? null); }
    if (input.isActive !== undefined) { sets.push('is_active = ?'); params.push(input.isActive ? 1 : 0); }
    if ('lastGeneratedDate' in input) { sets.push('last_generated_date = ?'); params.push(input.lastGeneratedDate ?? null); }

    if (sets.length === 0) {
      const existing = await this.getRecurringTransactionById(input.id);
      if (!existing) throw new Error(`RecurringTransaction ${input.id} not found`);
      return existing;
    }

    sets.push('updated_at = ?');
    params.push(Date.now());
    params.push(input.id);

    await this.db.runAsync(
      `UPDATE recurring_transactions SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getRecurringTransactionById(input.id);
    if (!updated) throw new Error(`RecurringTransaction ${input.id} not found`);
    return updated;
  }

  async deleteRecurringTransaction(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
  }

  async getTransactionsByRecurringId(recurringId: string): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{ id: string; type: string; amount: number; currency: string; date: string; account_id: string; category_id: string | null; to_account_id: string | null; notes: string | null; recurring_transaction_id: string | null; created_at: number; updated_at: number }>(
      'SELECT * FROM transactions WHERE recurring_transaction_id = ? ORDER BY date ASC',
      [recurringId]
    );
    return rows.map((r) => this.mapRowToTransaction(r));
  }

  private mapRowToRecurringTransaction(row: { id: string; type: string; amount: number; currency: string; account_id: string; to_account_id: string | null; category_id: string | null; notes: string | null; frequency: string; start_date: string; end_date: string | null; last_generated_date: string | null; is_active: number; created_at: number; updated_at: number }): RecurringTransaction {
    return {
      id: row.id,
      type: row.type as RecurringTransaction['type'],
      amount: row.amount,
      currency: row.currency,
      accountId: row.account_id,
      toAccountId: row.to_account_id ?? undefined,
      categoryId: row.category_id ?? undefined,
      notes: row.notes ?? undefined,
      frequency: row.frequency as RecurringTransaction['frequency'],
      startDate: row.start_date,
      endDate: row.end_date ?? undefined,
      lastGeneratedDate: row.last_generated_date ?? undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Migration Operations (F-040: Basic implementation)
  async getCurrentSchemaVersion(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM migrations'
    );

    return result[0]?.version ?? 0;
  }

  async runMigrations(_targetVersion?: number): Promise<void> {
    // Migrations are run automatically in initialize()
    // This method is here to satisfy the interface
  }

  async rollbackMigration(_targetVersion: number): Promise<void> {
    throw new Error('Migration rollback not implemented in mobile app');
  }
}
