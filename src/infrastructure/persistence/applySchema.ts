import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SqlQuery } from './SqlClient';
import { splitSqlStatements } from './sql';

const schemaFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations/001_initial.sql'
);

export function loadInitialSchemaSql(): string {
  return readFileSync(schemaFile, 'utf8');
}

export async function applySchema(db: SqlQuery): Promise<void> {
  for (const statement of splitSqlStatements(loadInitialSchemaSql())) {
    await db.query(statement);
  }
}
