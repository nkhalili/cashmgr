import { expose } from 'comlink';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { del, get } from 'idb-keyval';
import type { SqliteParams, SqliteRunResult } from '@cashmgr/db';

const STORAGE_KEY = 'cashmgr.accounts.sqlite';
const OPFS_FILE = '/cashmgr.db';

// Minimal interface covering only the API surface we use
interface Sqlite3Db {
  exec(opts: {
    sql: string;
    bind?: (string | number | null | bigint | Uint8Array)[];
    rowMode?: 'object' | 'array' | 'stmt';
    callback?: (row: Record<string, unknown>) => void;
  }): void;
  changes(): number;
  selectValue(sql: string): unknown;
}

let db: Sqlite3Db;

const initPromise = (async () => {
  // The published types omit the optional config argument — cast to accept it
  type InitFn = (config?: { print?: () => void; printErr?: () => void }) => Promise<{
    oo1: { OpfsDb: new (path: string) => Sqlite3Db };
  }>;
  const init = sqlite3InitModule as unknown as InitFn;
  const sqlite3 = await init({ print: () => {}, printErr: () => {} });

  // Migrate from IndexedDB → OPFS on first load.
  //
  // The migration is considered "pending" as long as the IndexedDB key exists,
  // regardless of whether an OPFS file was previously created. This makes the
  // migration idempotent: a partial/empty OPFS file from a failed earlier
  // attempt will be overwritten and the migration retried.
  const existing = await get<Uint8Array | undefined>(STORAGE_KEY);
  if (existing) {
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle('cashmgr.db', { create: true });
    const writable = await fileHandle.createWritable();
    // Copy into a plain ArrayBuffer (Uint8Array.buffer may be SharedArrayBuffer)
    const arrayBuffer = new Uint8Array(existing).buffer as ArrayBuffer;
    await writable.write(arrayBuffer);
    await writable.close();
    // Only delete IndexedDB entry after the OPFS write has fully committed
    await del(STORAGE_KEY);
  }

  db = new sqlite3.oo1.OpfsDb(OPFS_FILE);
})();

function bindParams(params: SqliteParams): (string | number | null | bigint | Uint8Array)[] | undefined {
  return params.length > 0 ? Array.from(params) as (string | number | null | bigint | Uint8Array)[] : undefined;
}

const workerApi = {
  async query<T = unknown>(sql: string, params: SqliteParams = []): Promise<T[]> {
    await initPromise;
    const rows: T[] = [];
    db.exec({
      sql,
      bind: bindParams(params),
      rowMode: 'object',
      callback: (row) => { rows.push(row as T); },
    });
    return rows;
  },

  async execute(sql: string, params: SqliteParams = []): Promise<SqliteRunResult> {
    await initPromise;
    db.exec({ sql, bind: bindParams(params) });
    const rowsAffected = db.changes();
    const lastInsertRowId = db.selectValue('SELECT last_insert_rowid()');
    return {
      rowsAffected,
      lastInsertRowId: typeof lastInsertRowId === 'number' ? lastInsertRowId : undefined,
    };
  },
};

expose(workerApi);
