import { ALL_SCHEMA_STATEMENTS } from '../schema';

/**
 * Database initialization helper
 * Platform-specific adapters will use this to set up the database
 */

export interface DatabaseInitializer {
  executeSql(sql: string, params?: unknown[]): Promise<void>;
  executeBatch(statements: string[]): Promise<void>;
}

export async function initializeDatabase(db: DatabaseInitializer): Promise<void> {
  // Note: This function is deprecated in favor of migration system (F-022)
  // Errors are propagated to caller for proper handling with ErrorHandler
  await db.executeBatch(ALL_SCHEMA_STATEMENTS);
}

export async function seedDefaultData(_db: DatabaseInitializer): Promise<void> {
  // Placeholder for seeding default categories, accounts, etc.
  // This will be implemented when the business logic is added
}
