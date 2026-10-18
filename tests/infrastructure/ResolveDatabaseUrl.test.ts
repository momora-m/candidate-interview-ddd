import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveDatabaseUrl } from '../../src/infrastructure/persistence/resolveDatabaseUrl';

describe('resolveDatabaseUrl', () => {
  test('uses DATABASE_URL when it is present', () => {
    assert.equal(
      resolveDatabaseUrl({
        DATABASE_URL: 'postgres://candidate:candidate@localhost:54329/candidate_interview',
        INSTANCE_CONNECTION_NAME: 'proj:asia-northeast1:db',
        DB_USER: 'ignored',
        DB_NAME: 'ignored',
      }),
      'postgres://candidate:candidate@localhost:54329/candidate_interview'
    );
    assert.equal(resolveDatabaseUrl({}), undefined);
    assert.equal(resolveDatabaseUrl({ DATABASE_URL: '   ' }), undefined);
  });

  test('builds a Cloud SQL unix socket URL', () => {
    assert.equal(
      resolveDatabaseUrl({
        INSTANCE_CONNECTION_NAME: 'proj:asia-northeast1:candidate',
        DB_USER: 'app user',
        DB_PASSWORD: 'p@ss word',
        DB_NAME: 'candidate_interview',
      }),
      'postgresql://app%20user:p%40ss%20word@/candidate_interview?host=/cloudsql/proj:asia-northeast1:candidate'
    );
  });

  test('omits the password when Cloud SQL auth does not need one', () => {
    assert.equal(
      resolveDatabaseUrl({
        INSTANCE_CONNECTION_NAME: 'proj:asia-northeast1:candidate',
        DB_USER: 'candidate',
        DB_NAME: 'candidate_interview',
      }),
      'postgresql://candidate@/candidate_interview?host=/cloudsql/proj:asia-northeast1:candidate'
    );
  });

  test('rejects a partial or malformed Cloud SQL setting', () => {
    assert.throws(
      () => resolveDatabaseUrl({ INSTANCE_CONNECTION_NAME: 'proj:asia-northeast1:candidate' }),
      /DB_USER/
    );
    assert.throws(
      () =>
        resolveDatabaseUrl({
          INSTANCE_CONNECTION_NAME: '../secrets',
          DB_USER: 'candidate',
          DB_NAME: 'candidate_interview',
        }),
      /project:region:instance/
    );
  });
});
