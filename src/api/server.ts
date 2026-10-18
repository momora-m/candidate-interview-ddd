import { serve } from '@hono/node-server';
import {
  createInMemoryCandidateRuntime,
  createPostgresCandidateRuntime,
} from '@/infrastructure/createCandidateRuntime';
import { createApp, type ApiRuntime } from './app';

const port = Number(process.env.PORT ?? 4317);
const databaseUrl = process.env.DATABASE_URL;

const runtime = await openRuntime(databaseUrl);
const app = createApp(runtime.api);

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(
      `Candidate API listening on http://127.0.0.1:${info.port} (${runtime.api.persistence})`
    );
  }
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await runtime.close();
      process.exit(0);
    });
  });
}

async function openRuntime(connectionString: string | undefined): Promise<{
  api: ApiRuntime;
  close: () => Promise<void>;
}> {
  const candidate = connectionString
    ? await createPostgresCandidateRuntime(connectionString)
    : createInMemoryCandidateRuntime();
  if (!connectionString) {
    await candidate.prepare();
  }
  return {
    api: {
      persistence: candidate.persistence,
      queries: candidate.queries,
      useCases: candidate.useCases,
      eventBus: candidate.eventBus,
    },
    close: () => candidate.close(),
  };
}
