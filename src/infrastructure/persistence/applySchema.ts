import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SqlQuery } from './SqlClient';
import { splitSqlStatements } from './sql';

const migrationDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../db/migrations');

const schemaFiles = ['001_initial.sql', '003_domain_events_and_read_models.sql'] as const;

export function loadInitialSchemaSql(): string {
  return schemaFiles.map((file) => readFileSync(resolve(migrationDir, file), 'utf8')).join('\n');
}

export async function applySchema(db: SqlQuery): Promise<void> {
  for (const file of schemaFiles) {
    const sql = readFileSync(resolve(migrationDir, file), 'utf8');
    for (const statement of splitSqlStatements(sql)) {
      await db.query(statement);
    }
  }
}
