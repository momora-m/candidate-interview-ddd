import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SqlClient } from './SqlClient';
import { splitSqlStatements } from './sql';

export const migrationDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations'
);

const MIGRATION_FILE = /^\d{3}_.+\.sql$/i;

export interface MigrationReport {
  applied: string[];
  skipped: string[];
}

/**
 * Schema files are `db/migrations/NNN_*.sql` in filename order.
 * Files whose names contain "seed" are development data and are never applied here.
 */
export function listSchemaMigrationFiles(directory: string = migrationDirectory): string[] {
  return readdirSync(directory)
    .filter((name) => MIGRATION_FILE.test(name) && !/seed/i.test(name))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Applies pending schema files and records them in `schema_migrations`.
 * Already-applied files are left untouched. Safe to run on every process start.
 */
export async function applyMigrations(
  db: SqlClient,
  directory: string = migrationDirectory
): Promise<MigrationReport> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL
    )
  `);

  const existing = await db.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const appliedNames = new Set(existing.rows.map((row) => row.filename));
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const filename of listSchemaMigrationFiles(directory)) {
    if (appliedNames.has(filename)) {
      skipped.push(filename);
      continue;
    }

    const sql = readFileSync(resolve(directory, filename), 'utf8');
    const statements = splitSqlStatements(sql);
    await db.transaction(async (tx) => {
      for (const statement of statements) {
        await tx.query(statement);
      }
      await tx.query('INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, NOW())', [
        filename,
      ]);
    });
    applied.push(filename);
  }

  return { applied, skipped };
}
