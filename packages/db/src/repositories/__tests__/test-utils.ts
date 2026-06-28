import Database from 'better-sqlite3';
import { SqliteDatabase, SqliteParams, SqliteRunResult } from '../../sqlite/types';

/**
 * All SQL statements needed to create the test database schema
 * Includes all migrations up to current version
 */
const ALL_TEST_SCHEMA_STATEMENTS = [
  // Migration 001: Initial schema
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash','bank','credit')),
    balance REAL NOT NULL DEFAULT 0,
    initial_balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    parent_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
  );`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    date TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT,
    to_account_id TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
  );`,
  'CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);',
  'CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);',
  'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);',
  // Migration 002: Currencies table
  `CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    exchange_rate REAL NOT NULL DEFAULT 1.0,
    last_updated INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  'CREATE INDEX IF NOT EXISTS idx_currencies_primary ON currencies(is_primary);',
  'CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active);',
  // Migration 003: Settings table
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  // Migration 005: Budgets table
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    amount REAL NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE (category_id, month, year)
  );`,
  'CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(year, month);',
  'CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);',
  // Migration 006: Soft-delete for budgets
  'ALTER TABLE budgets ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
  'CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_deleted);',
  // Migration 008: Recurring transactions table
  `CREATE TABLE IF NOT EXISTS recurring_transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    category_id TEXT,
    notes TEXT,
    frequency TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    last_generated_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );`,
  'CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_recurring_account ON recurring_transactions(account_id);',
  // Migration 009: Link transactions to recurring templates
  'ALTER TABLE transactions ADD COLUMN recurring_transaction_id TEXT;',
  'CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring_transaction_id);',
];

/**
 * In-memory SQLite database implementation for testing
 */
export class InMemorySqliteDatabase implements SqliteDatabase {
  constructor(private readonly db: Database.Database) {}

  async execute(sql: string, params?: SqliteParams): Promise<SqliteRunResult> {
    const statement = this.db.prepare(sql);
    const result = params ? statement.run(...params) : statement.run();
    const lastInsertRowId = result.lastInsertRowid;

    return {
      rowsAffected: result.changes,
      lastInsertRowId:
        typeof lastInsertRowId === 'bigint' ? Number(lastInsertRowId) : lastInsertRowId,
    };
  }

  async query<T>(sql: string, params?: SqliteParams): Promise<T[]> {
    const statement = this.db.prepare(sql);
    return (params ? statement.all(...params) : statement.all()) as T[];
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/**
 * Creates a fresh in-memory test database with all schema applied
 */
export function createTestDatabase(): InMemorySqliteDatabase {
  const rawDb = new Database(':memory:');
  rawDb.pragma('foreign_keys = ON');

  for (const statement of ALL_TEST_SCHEMA_STATEMENTS) {
    rawDb.exec(statement);
  }

  return new InMemorySqliteDatabase(rawDb);
}

/**
 * Helper to insert test account directly into database
 */
export async function insertTestAccount(
  db: InMemorySqliteDatabase,
  data: {
    id: string;
    name: string;
    type?: string;
    currency?: string;
    balance?: number;
  }
): Promise<void> {
  const now = Date.now();
  await db.execute(
    `INSERT INTO accounts (id, name, type, balance, initial_balance, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.name,
      data.type ?? 'cash',
      data.balance ?? 0,
      0,
      data.currency ?? 'USD',
      now,
      now,
    ]
  );
}

/**
 * Helper to insert test category directly into database
 */
export async function insertTestCategory(
  db: InMemorySqliteDatabase,
  data: {
    id: string;
    name: string;
    type: string;
    parentId?: string;
    icon?: string;
    color?: string;
  }
): Promise<void> {
  const now = Date.now();
  await db.execute(
    `INSERT INTO categories (id, name, type, parent_id, icon, color, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.name,
      data.type,
      data.parentId ?? null,
      data.icon ?? null,
      data.color ?? null,
      1,
      now,
      now,
    ]
  );
}
