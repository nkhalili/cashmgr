export type SqliteValue = string | number | null | Uint8Array;

export type SqliteParams = readonly SqliteValue[];

export interface SqliteRunResult {
  rowsAffected: number;
  lastInsertRowId?: number;
}

export interface SqliteDatabase {
  execute(sql: string, params?: SqliteParams): Promise<SqliteRunResult>;
  query<T = unknown>(sql: string, params?: SqliteParams): Promise<T[]>;
  close(): Promise<void> | void;
}
