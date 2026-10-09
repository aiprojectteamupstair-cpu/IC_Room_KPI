declare module "pg" {
  export interface QueryResult<T> {
    rows: T[];
    rowCount: number | null;
  }
  export interface PoolClient {
    query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    release(): void;
  }
  export class Pool {
    constructor(config: { connectionString: string; max?: number; idleTimeoutMillis?: number });
    connect(): Promise<PoolClient>;
    query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
  export const types: { setTypeParser: (oid: number, parser: (value: string) => unknown) => void };
}
