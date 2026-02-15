declare module 'sql.js' {
  export class Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    saveToFile(filename: string): void;
    constructor(data?: Uint8Array);
  }

  export class Statement {
    bind(params: unknown[]): boolean;
    step(): boolean;
    get(params?: unknown[]): unknown[] | null;
    getAsObject(params?: unknown[]): unknown;
    free(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface SqlJsConfig {
    locateFile: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<{
    Database: typeof Database;
    Statement: typeof Statement;
  }>;
}
