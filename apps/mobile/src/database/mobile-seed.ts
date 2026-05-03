/**
 * Mobile-specific database seeding
 * Usage: Call seedMobileDatabase() to populate the app with sample data
 */
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { seedDatabase, clearSeedData, SEED_ACCOUNTS, SEED_CATEGORIES } from '@cashmgr/db';
import { ExpoSqliteWrapper } from './expo-sqlite-wrapper';

/**
 * Seed the mobile database with sample data
 * This can be called from a settings screen or development menu
 */
export async function seedMobileDatabase(): Promise<void> {
  const db = await SQLite.openDatabaseAsync('cashmgr.db');
  const wrapper = new ExpoSqliteWrapper(db);

  try {
    // Use expo-crypto for UUID generation in React Native
    await seedDatabase(wrapper, () => Crypto.randomUUID());
  } finally {
    // Note: We don't close the database as it's managed by the app
  }
}

/**
 * Clear all seed data from the mobile database
 */
export async function clearMobileSeedData(): Promise<void> {
  const db = await SQLite.openDatabaseAsync('cashmgr.db');
  const wrapper = new ExpoSqliteWrapper(db);

  try {
    await clearSeedData(wrapper);
  } finally {
    // Note: We don't close the database as it's managed by the app
  }
}

/**
 * Check if the database has any data
 */
export async function hasMobileData(): Promise<boolean> {
  const db = await SQLite.openDatabaseAsync('cashmgr.db');
  const result = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
  return (result[0]?.count ?? 0) > 0;
}

// Re-export seed constants for reference
export { SEED_ACCOUNTS, SEED_CATEGORIES };
