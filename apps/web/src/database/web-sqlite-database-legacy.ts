import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { get, set } from 'idb-keyval';
import type { BindParams, SqlJsStatic } from 'sql.js';
import type { SqliteDatabase, SqliteParams, SqliteRunResult } from '@cashmgr/db';

const STORAGE_KEY = 'cashmgr.accounts.sqlite';

// Cache the WASM module — expensive to load, safe to reuse across operations
let sqlModule: SqlJsStatic | null = null;

async function getSqlModule(): Promise<SqlJsStatic> {
  if (!sqlModule) {
    sqlModule = await initSqlJs({ locateFile: () => sqlWasmUrl });
  }
  return sqlModule;
}

/**
 * Stateless IndexedDB-backed SQLite database.
 *
 * Each operation loads the latest database state from IndexedDB, runs the SQL,
 * writes back (for mutations), then frees memory. There is no persistent
 * in-memory copy, so concurrent instances (e.g. seeding + main app) always
 * see and write the same source of truth.
 */
export class WebSqliteDatabase implements SqliteDatabase {
  async query<T = unknown>(sql: string, params: SqliteParams = []): Promise<T[]> {
    const SQL = await getSqlModule();
    const existing = await get<Uint8Array | undefined>(STORAGE_KEY);
    const db = existing ? new SQL.Database(existing) : new SQL.Database();
    try {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(this.normalizeParams(params));
        const rows: T[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        return rows;
      } finally {
        stmt.free();
      }
    } finally {
      db.close();
    }
  }

  async execute(sql: string, params: SqliteParams = []): Promise<SqliteRunResult> {
    const SQL = await getSqlModule();
    const existing = await get<Uint8Array | undefined>(STORAGE_KEY);
    const db = existing ? new SQL.Database(existing) : new SQL.Database();
    try {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(this.normalizeParams(params));
        stmt.step();
      } finally {
        stmt.free();
      }

      const rowsAffected = db.getRowsModified();
      const lastInsertRowId = this.readLastInsertRowId(db);

      await set(STORAGE_KEY, db.export());

      return { rowsAffected, lastInsertRowId };
    } finally {
      db.close();
    }
  }

  async close(): Promise<void> {
    // No-op: no persistent in-memory state to release.
    // All state lives in IndexedDB and is persisted after every execute().
  }

  private normalizeParams(params?: SqliteParams): BindParams {
    return params ? Array.from(params) : [];
  }

  private readLastInsertRowId(db: InstanceType<SqlJsStatic['Database']>): number | undefined {
    const result = db.exec('SELECT last_insert_rowid() as id;');
    const value = result?.[0]?.values?.[0]?.[0];
    return typeof value === 'number' ? value : undefined;
  }
}
