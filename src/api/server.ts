import { serve } from '@hono/node-server';
import { createCandidateUseCases } from '@/application/createCandidateUseCases';
import { CandidateQueryService } from '@/application/queries/CandidateQueryService';
import { InMemoryEventBus } from '@/infrastructure/event-bus/InMemoryEventBus';
import { createPostgresPersistence } from '@/infrastructure/persistence/createPostgresPersistence';
import { InMemoryJobApplicationRepository } from '@/infrastructure/repositories/InMemoryJobApplicationRepository';
import { InMemoryTargetCompanyRepository } from '@/infrastructure/repositories/InMemoryTargetCompanyRepository';
import { seedCandidateData } from '@/infrastructure/seeds/SeedCandidateData';
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
  const eventBus = new InMemoryEventBus();

  if (connectionString) {
    const persistence = await createPostgresPersistence(connectionString);
    return {
      api: {
        persistence: 'postgres',
        queries: new CandidateQueryService(
          persistence.companyRepository,
          persistence.applicationRepository,
          eventBus
        ),
        useCases: createCandidateUseCases(
          persistence.companyRepository,
          persistence.applicationRepository,
          eventBus
        ),
      },
      close: () => persistence.db.close(),
    };
  }

  const companyRepo = new InMemoryTargetCompanyRepository();
  const applicationRepo = new InMemoryJobApplicationRepository();
  await seedCandidateData(companyRepo, applicationRepo, eventBus);
  return {
    api: {
      persistence: 'memory',
      queries: new CandidateQueryService(companyRepo, applicationRepo, eventBus),
      useCases: createCandidateUseCases(companyRepo, applicationRepo, eventBus),
    },
    close: async () => {},
  };
}
