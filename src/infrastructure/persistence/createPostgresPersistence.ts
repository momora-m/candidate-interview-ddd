import { PostgresJobApplicationRepository } from './repositories/PostgresJobApplicationRepository';
import { PostgresTargetCompanyRepository } from './repositories/PostgresTargetCompanyRepository';
import { applyMigrations } from './migrate';
import { PgDatabase } from './PgDatabase';

export interface PostgresPersistence {
  db: PgDatabase;
  companyRepository: PostgresTargetCompanyRepository;
  applicationRepository: PostgresJobApplicationRepository;
}

/**
 * Opens a PostgreSQL pool, applies pending schema migrations, and returns both repositories.
 * Seed files are not applied. Safe to call on every process start.
 */
export async function createPostgresPersistence(
  connectionString: string
): Promise<PostgresPersistence> {
  const db = PgDatabase.fromConnectionString(connectionString);
  const report = await applyMigrations(db);
  if (report.applied.length > 0) {
    console.log(`Applied schema migrations: ${report.applied.join(', ')}`);
  }
  return {
    db,
    companyRepository: new PostgresTargetCompanyRepository(db),
    applicationRepository: new PostgresJobApplicationRepository(db),
  };
}
