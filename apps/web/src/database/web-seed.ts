/**
 * Web-specific database seeding
 * Usage: Call seedWebDatabase() to populate the app with sample data
 */
import { seedDatabase, clearSeedData, SEED_ACCOUNTS, SEED_CATEGORIES } from '@cashmgr/db';
import type { SqliteDatabase } from '@cashmgr/db';

/**
 * Seed the web database with sample data
 */
export async function seedWebDatabase(db: SqliteDatabase): Promise<void> {
  await seedDatabase(db);
}

/**
 * Clear all seed data from the web database
 */
export async function clearWebSeedData(db: SqliteDatabase): Promise<void> {
  await clearSeedData(db);
}

/**
 * Check if the database has any data
 */
export async function hasWebData(db: SqliteDatabase): Promise<boolean> {
  const result = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
  return (result[0]?.count ?? 0) > 0;
}

// Re-export seed constants for reference
export { SEED_ACCOUNTS, SEED_CATEGORIES };
