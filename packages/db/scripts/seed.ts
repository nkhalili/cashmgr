#!/usr/bin/env tsx
/**
 * CLI script to seed the database with sample data
 * Usage: pnpm --filter @cashmgr/db seed
 */

import Database from 'better-sqlite3';
import type { SqliteDatabase, SqliteParams, SqliteRunResult } from '../src/sqlite/types';
import { seedDatabase } from '../src/seed';
import { runMigrations } from '../src/migration-runner';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Wrapper to make better-sqlite3 compatible with SqliteDatabase interface
 */
class BetterSqlite3Wrapper implements SqliteDatabase {
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

  close(): void {
    this.db.close();
  }
}

async function main() {
  // Prevent running in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot run seed in production environment');
    process.exit(1);
  }

  // Determine database path
  const dbDir = process.env.DB_PATH || path.join(process.cwd(), '../../.dev-db');
  const dbPath = path.join(dbDir, 'cashmgr.db');

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`📁 Using database: ${dbPath}\n`);

  // Open database connection
  const rawDb = new Database(dbPath);
  rawDb.pragma('foreign_keys = ON');
  const db = new BetterSqlite3Wrapper(rawDb);

  try {
    // Initialize schema if needed
    await runMigrations(db);

    // Seed the database
    await seedDatabase(db);

    console.log('\n✨ Done! Your database is now populated with sample data.');
    console.log('   Start your app to see the data in action.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
