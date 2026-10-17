export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * A single SQL connection or an open transaction.
 * Parameters use PostgreSQL placeholders ($1, $2, ...).
 */
export interface SqlQuery {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
}

/**
 * Persistence entry point used by repositories.
 * `transaction` is the unit of consistency for one aggregate save.
 */
export interface SqlClient extends SqlQuery {
  transaction<T>(work: (tx: SqlQuery) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
