/**
 * Database migration system
 * F-022: Implements versioned schema migrations
 */

export interface Migration {
  version: number;
  description: string;
  up: string[];   // SQL statements to apply migration
  down: string[]; // SQL statements to rollback migration
}

/**
 * Schema migrations table
 * Tracks which migrations have been applied
 */
export const SCHEMA_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );
`;

/**
 * Migration 001: Initial schema
 * Creates accounts, categories, and transactions tables
 */
const MIGRATION_001: Migration = {
  version: 1,
  description: 'Initial schema',
  up: [
    // Accounts table
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
    // Categories table
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
    // Transactions table
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      description TEXT NOT NULL,
      date INTEGER NOT NULL,
      account_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      to_account_id TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
    );`,
    // Indexes
    'CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);',
    'CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);',
    'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);',
  ],
  down: [
    'DROP INDEX IF EXISTS idx_categories_parent;',
    'DROP INDEX IF EXISTS idx_categories_type;',
    'DROP INDEX IF EXISTS idx_transactions_type;',
    'DROP INDEX IF EXISTS idx_transactions_category;',
    'DROP INDEX IF EXISTS idx_transactions_account;',
    'DROP INDEX IF EXISTS idx_transactions_date;',
    'DROP INDEX IF EXISTS idx_accounts_type;',
    'DROP TABLE IF EXISTS transactions;',
    'DROP TABLE IF EXISTS categories;',
    'DROP TABLE IF EXISTS accounts;',
  ],
};

/**
 * Migration 002: Multi-Currency Support - Currencies Table
 * F-030: Adds currencies table for managing primary and sub-currencies
 */
const MIGRATION_002: Migration = {
  version: 2,
  description: 'Add currencies table for multi-currency support',
  up: [
    // Currencies table
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
    // Index for primary currency lookup
    'CREATE INDEX IF NOT EXISTS idx_currencies_primary ON currencies(is_primary);',
    // Index for active currencies
    'CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active);',
    // Insert default USD currency as primary
    `INSERT INTO currencies (id, name, symbol, is_primary, exchange_rate, last_updated, is_active, created_at, updated_at)
     VALUES ('USD', 'US Dollar', '$', 1, 1.0, ${Date.now()}, 1, ${Date.now()}, ${Date.now()});`,
  ],
  down: [
    'DROP INDEX IF EXISTS idx_currencies_active;',
    'DROP INDEX IF EXISTS idx_currencies_primary;',
    'DROP TABLE IF EXISTS currencies;',
  ],
};

/**
 * Migration 003: Settings Table
 * F-030: Adds settings table for application-wide configuration
 */
const MIGRATION_003: Migration = {
  version: 3,
  description: 'Add settings table for application configuration',
  up: [
    // Settings table (key-value store)
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    // Insert default primary currency setting
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('primary_currency', 'USD', ${Date.now()});`,
  ],
  down: [
    'DROP TABLE IF EXISTS settings;',
  ],
};

/**
 * Migration 004: Fix transactions table schema
 * - Remove description column (no longer used)
 * - Make category_id nullable (transfers don't have categories)
 * - Change date from INTEGER to TEXT (YYYY-MM-DD format for timezone-agnostic dates)
 */
const MIGRATION_004: Migration = {
  version: 4,
  description: 'Fix transactions table schema (nullable category_id, remove description, date as TEXT)',
  up: [
    // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    // Step 1: Create new table with correct schema
    `CREATE TABLE IF NOT EXISTS transactions_new (
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
    // Step 2: Copy data from old table (converting date from INTEGER to TEXT if needed)
    `INSERT INTO transactions_new (id, type, amount, currency, date, account_id, category_id, to_account_id, notes, created_at, updated_at)
     SELECT id, type, amount, currency,
       CASE
         WHEN typeof(date) = 'integer' THEN date(date / 1000, 'unixepoch')
         ELSE date
       END,
       account_id, category_id, to_account_id, notes, created_at, updated_at
     FROM transactions;`,
    // Step 3: Drop old table
    'DROP TABLE transactions;',
    // Step 4: Rename new table
    'ALTER TABLE transactions_new RENAME TO transactions;',
    // Step 5: Recreate indexes
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);',
  ],
  down: [
    // Reverting would require converting back, which is lossy - not recommended
    // This is a destructive migration
  ],
};

/**
 * Migration 005: Budgets Table
 * F-063: Monthly per-category expense budgets
 */
const MIGRATION_005: Migration = {
  version: 5,
  description: 'Add budgets table for monthly category budgets',
  up: [
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
  ],
  down: [
    'DROP INDEX IF EXISTS idx_budgets_category;',
    'DROP INDEX IF EXISTS idx_budgets_period;',
    'DROP TABLE IF EXISTS budgets;',
  ],
};

/**
 * Migration 006: Soft-delete for budgets
 * Adds is_deleted flag so deletions act as stop signals for auto-carry-forward.
 */
const MIGRATION_006: Migration = {
  version: 6,
  description: 'Add is_deleted column to budgets for soft-delete support',
  up: [
    'ALTER TABLE budgets ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
    'CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_deleted);',
  ],
  down: [
    'DROP INDEX IF EXISTS idx_budgets_active;',
    // SQLite does not support DROP COLUMN before version 3.35 — rebuild the table
    `CREATE TABLE IF NOT EXISTS budgets_old AS SELECT id, category_id, amount, month, year, created_at, updated_at FROM budgets WHERE is_deleted = 0;`,
    'DROP TABLE budgets;',
    'ALTER TABLE budgets_old RENAME TO budgets;',
  ],
};

/**
 * Migration 007: Remove redundant primary_currency setting
 * currencies.is_primary is the source of truth; the settings key was never read back.
 */
const MIGRATION_007: Migration = {
  version: 7,
  description: 'Remove redundant primary_currency from settings table',
  up: [
    `DELETE FROM settings WHERE key = 'primary_currency';`,
  ],
  down: [
    `INSERT OR IGNORE INTO settings (key, value, updated_at)
     SELECT id, id, strftime('%s','now') * 1000 FROM currencies WHERE is_primary = 1 LIMIT 1;`,
  ],
};

/**
 * All migrations in order
 * IMPORTANT: Never modify existing migrations!
 * Always add new migrations with incremented version numbers.
 */
export const migrations: Migration[] = [
  MIGRATION_001,
  MIGRATION_002,
  MIGRATION_003,
  MIGRATION_004,
  MIGRATION_005,
  MIGRATION_006,
  MIGRATION_007,
  // Future migrations go here
];

/**
 * Get all migrations that need to be applied
 */
export function getMigrationsToRun(currentVersion: number): Migration[] {
  return migrations.filter((m) => m.version > currentVersion);
}

/**
 * Get migrations to rollback
 */
export function getMigrationsToRollback(currentVersion: number, targetVersion: number): Migration[] {
  return migrations
    .filter((m) => m.version <= currentVersion && m.version > targetVersion)
    .reverse(); // Rollback in reverse order
}

/**
 * Get the latest migration version
 */
export function getLatestVersion(): number {
  return migrations.length > 0 ? Math.max(...migrations.map((m) => m.version)) : 0;
}
