import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { applyMigrations, listSchemaMigrationFiles } from '../../src/infrastructure/persistence/migrate';
import { PgliteDatabase } from './PgliteDatabase';

describe('schema migrations', () => {
  test('lists schema files and skips seed scripts', () => {
    assert.deepEqual(listSchemaMigrationFiles(), [
      '001_initial.sql',
      '003_domain_events_and_read_models.sql',
    ]);
  });

  test('applies each schema file once and does not run seed files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migrations-'));
    writeFileSync(join(directory, '001_init.sql'), 'CREATE TABLE demo (id INT PRIMARY KEY);');
    writeFileSync(join(directory, '002_seed.sql'), 'INSERT INTO demo (id) VALUES (1);');
    writeFileSync(join(directory, '003_more.sql'), 'CREATE TABLE demo_more (id INT PRIMARY KEY);');
    writeFileSync(join(directory, 'notes.txt'), 'ignore me');
    const db = await PgliteDatabase.create();
    try {
      const first = await applyMigrations(db, directory);
      assert.deepEqual(first.applied, ['001_init.sql', '003_more.sql']);
      assert.deepEqual(first.skipped, []);

      const second = await applyMigrations(db, directory);
      assert.deepEqual(second.applied, []);
      assert.deepEqual(second.skipped, ['001_init.sql', '003_more.sql']);

      const demo = await db.query('SELECT id FROM demo');
      assert.equal(demo.rowCount, 0);
      const more = await db.query('SELECT id FROM demo_more');
      assert.equal(more.rowCount, 0);
    } finally {
      await db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('applies the repository schema on startup and skips it the second time', async () => {
    const db = await PgliteDatabase.create();
    try {
      const first = await applyMigrations(db);
      assert.deepEqual(first.applied, [
        '001_initial.sql',
        '003_domain_events_and_read_models.sql',
      ]);
      const second = await applyMigrations(db);
      assert.deepEqual(second.applied, []);
      const tables = await db.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schema_migrations'"
      );
      assert.equal(tables.rowCount, 1);
    } finally {
      await db.close();
    }
  });
});
