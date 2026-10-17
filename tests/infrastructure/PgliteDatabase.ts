import { PGlite } from '@electric-sql/pglite';
import type { QueryResult, SqlClient, SqlQuery } from '../../src/infrastructure/persistence/SqlClient';

/**
 * In-process PostgreSQL used by repository tests.
 * The production adapter is PgDatabase; repositories only see SqlClient.
 */
export class PgliteDatabase implements SqlClient {
  private constructor(private readonly db: PGlite) {}

  public static async create(): Promise<PgliteDatabase> {
    const db = new PGlite();
    await db.waitReady;
    return new PgliteDatabase(db);
  }

  public async query<T extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>> {
    const result = await this.db.query<T>(text, values ? [...values] : []);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    };
  }

  public async transaction<T>(work: (tx: SqlQuery) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => work(wrap(tx)));
  }

  public async close(): Promise<void> {
    await this.db.close();
  }
}

function wrap(tx: { query: PGlite['query'] }): SqlQuery {
  return {
    async query<T extends Record<string, unknown>>(
      text: string,
      values?: readonly unknown[]
    ): Promise<QueryResult<T>> {
      const result = await tx.query<T>(text, values ? [...values] : []);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
      };
    },
  };
}
