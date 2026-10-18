import { createPostgresPersistence } from '../createPostgresPersistence';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'DATABASE_URL が未設定です。例: postgres://candidate:candidate@localhost:54329/candidate_interview'
  );
  process.exit(1);
}

const persistence = await createPostgresPersistence(connectionString);
await persistence.db.close();
console.log('PostgreSQL schema migrations are up to date. Seed data was not applied.');
