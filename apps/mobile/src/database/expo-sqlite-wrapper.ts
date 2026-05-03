/**
 * Wrapper to make expo-sqlite compatible with SqliteDatabase interface
 * This allows using the shared seeding functions from @cashmgr/db
 */
import * as SQLite from 'expo-sqlite';
import type { SqliteDatabase, SqliteParams, SqliteRunResult } from '@cashmgr/db';

export class ExpoSqliteWrapper implements SqliteDatabase {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async execute(sql: string, params?: SqliteParams): Promise<SqliteRunResult> {
    const result = await this.db.runAsync(sql, params ? Array.from(params) : []);
    return {
      rowsAffected: result.changes,
      lastInsertRowId: result.lastInsertRowId ? Number(result.lastInsertRowId) : undefined,
    };
  }

  async query<T>(sql: string, params?: SqliteParams): Promise<T[]> {
    return await this.db.getAllAsync<T>(sql, params ? Array.from(params) : []);
  }

  async close(): Promise<void> {
    await this.db.closeAsync();
  }
}
