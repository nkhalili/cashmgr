import { wrap } from 'comlink';
import type { Remote } from 'comlink';
import type { SqliteDatabase, SqliteParams, SqliteRunResult } from '@cashmgr/db';
import { WebSqliteDatabase as LegacyWebSqliteDatabase } from './web-sqlite-database-legacy';

// Comlink's Remote<T> doesn't propagate generic type parameters on methods,
// so we declare the proxy type explicitly with non-generic signatures.
type WorkerProxy = Remote<{
  query(sql: string, params?: SqliteParams): Promise<unknown[]>;
  execute(sql: string, params?: SqliteParams): Promise<SqliteRunResult>;
}>;

function isOPFSSupported(): boolean {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    console.warn('[CashMgr] navigator.storage unavailable — OPFS not supported. Falling back to IndexedDB-backed SQLite.');
    return false;
  }
  if (typeof navigator.storage.getDirectory !== 'function') {
    console.warn('[CashMgr] navigator.storage.getDirectory unavailable — OPFS not supported. Falling back to IndexedDB-backed SQLite.');
    return false;
  }
  if (typeof SharedArrayBuffer === 'undefined') {
    console.warn(
      '[CashMgr] SharedArrayBuffer unavailable — the page is not cross-origin isolated. ' +
      'Ensure the server sends Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers. ' +
      'Falling back to IndexedDB-backed SQLite. Performance may be degraded.',
    );
    return false;
  }
  return true;
}

class OPFSSqliteDatabase implements SqliteDatabase {
  private worker: Worker;
  private proxy: WorkerProxy;

  constructor() {
    this.worker = new Worker(new URL('./web-sqlite-database.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.proxy = wrap<{
      query(sql: string, params?: SqliteParams): Promise<unknown[]>;
      execute(sql: string, params?: SqliteParams): Promise<SqliteRunResult>;
    }>(this.worker);
  }

  async query<T = unknown>(sql: string, params: SqliteParams = []): Promise<T[]> {
    const rows = await this.proxy.query(sql, params);
    return rows as T[];
  }

  execute(sql: string, params: SqliteParams = []): Promise<SqliteRunResult> {
    return this.proxy.execute(sql, params);
  }

  async close(): Promise<void> {
    this.worker.terminate();
  }
}

export function createWebSqliteDatabase(): SqliteDatabase {
  if (isOPFSSupported()) {
    return new OPFSSqliteDatabase();
  }
  return new LegacyWebSqliteDatabase();
}

// Keep named export so any direct references to WebSqliteDatabase keep working
export { LegacyWebSqliteDatabase as WebSqliteDatabase };
