import { Pool, type PoolClient } from 'pg';
import type { QueryResult, SqlClient, SqlQuery } from './SqlClient';

/**
 * node-postgres adapter for Cloud SQL / local PostgreSQL.
 * Repositories depend on {@link SqlClient}, not on this class.
 */
export class PgDatabase implements SqlClient {
  private readonly pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  public static fromConnectionString(connectionString: string): PgDatabase {
    return new PgDatabase(new Pool({ connectionString }));
  }

  public async query<T extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>> {
    const result = await this.pool.query<T>(text, values ? [...values] : undefined);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    };
  }

  public async transaction<T>(work: (tx: SqlQuery) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await work(createClientQuery(client));
      await client.query('COMMIT');
      return value;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The original error is the one the caller needs.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

function createClientQuery(client: PoolClient): SqlQuery {
  return {
    async query<T extends Record<string, unknown>>(
      text: string,
      values?: readonly unknown[]
    ): Promise<QueryResult<T>> {
      const result = await client.query<T>(text, values ? [...values] : undefined);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
      };
    },
  };
}
