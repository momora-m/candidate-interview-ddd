import { PostgresJobApplicationRepository } from './repositories/PostgresJobApplicationRepository';
import { PostgresTargetCompanyRepository } from './repositories/PostgresTargetCompanyRepository';
import { applySchema } from './applySchema';
import { PgDatabase } from './PgDatabase';

export interface PostgresPersistence {
  db: PgDatabase;
  companyRepository: PostgresTargetCompanyRepository;
  applicationRepository: PostgresJobApplicationRepository;
}

/**
 * Opens a PostgreSQL pool, applies the initial schema, and returns both repositories.
 * Safe to call against a database that already has the tables.
 */
export async function createPostgresPersistence(
  connectionString: string
): Promise<PostgresPersistence> {
  const db = PgDatabase.fromConnectionString(connectionString);
  await applySchema(db);
  return {
    db,
    companyRepository: new PostgresTargetCompanyRepository(db),
    applicationRepository: new PostgresJobApplicationRepository(db),
  };
}
