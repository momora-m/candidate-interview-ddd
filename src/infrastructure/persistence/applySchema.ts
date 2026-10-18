import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SqlQuery } from './SqlClient';
import { listSchemaMigrationFiles, migrationDirectory } from './migrate';
import { splitSqlStatements } from './sql';

export function loadInitialSchemaSql(): string {
  return listSchemaMigrationFiles()
    .map((file) => readFileSync(resolve(migrationDirectory, file), 'utf8'))
    .join('\n');
}

export async function applySchema(db: SqlQuery): Promise<void> {
  for (const file of listSchemaMigrationFiles()) {
    const sql = readFileSync(resolve(migrationDirectory, file), 'utf8');
    for (const statement of splitSqlStatements(sql)) {
      await db.query(statement);
    }
  }
}
