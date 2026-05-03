declare module 'sql.js' {
  export type SqlValue = string | number | null | Uint8Array;

  export type BindParams = SqlValue[] | Record<string, SqlValue>;

  export interface Statement {
    bind(values?: BindParams): boolean;
    step(): boolean;
    getAsObject<T extends Record<string, SqlValue>>(): T;
    free(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export interface Database {
    prepare(sql: string, params?: BindParams): Statement;
    exec(sql: string, params?: BindParams): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string;
  export default url;
}
