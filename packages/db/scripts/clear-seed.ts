#!/usr/bin/env tsx
/**
 * CLI script to clear seeded data from the database
 * Usage: pnpm --filter @cashmgr/db seed:clear
 */

import Database from 'better-sqlite3';
import type { SqliteDatabase, SqliteParams, SqliteRunResult } from '../src/sqlite/types';
import { clearSeedData } from '../src/seed';
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
    console.error('❌ Cannot run in production environment');
    process.exit(1);
  }

  // Determine database path
  const dbDir = process.env.DB_PATH || path.join(process.cwd(), '../../.dev-db');
  const dbPath = path.join(dbDir, 'cashmgr.db');

  if (!fs.existsSync(dbPath)) {
    console.log('ℹ️  Database does not exist. Nothing to clear.');
    return;
  }

  console.log(`📁 Using database: ${dbPath}\n`);

  // Open database connection
  const rawDb = new Database(dbPath);
  rawDb.pragma('foreign_keys = ON');
  const db = new BetterSqlite3Wrapper(rawDb);

  try {
    // Clear seed data
    await clearSeedData(db);

    console.log('\n✨ Done! All seed data has been cleared.');
  } catch (error) {
    console.error('\n❌ Clearing failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
