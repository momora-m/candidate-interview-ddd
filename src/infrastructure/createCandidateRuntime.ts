import { createCandidateUseCases, type CandidateUseCases } from '@/application/createCandidateUseCases';
import type { DomainEventDispatchLog } from '@/application/events/DomainEventDispatchLog';
import type { IEventBus } from '@/application/events/IEventBus';
import { CandidateQueryService } from '@/application/queries/CandidateQueryService';
import type { CandidateReadModel } from '@/application/read-model/screenReadModel';
import { CandidateReadModelProjector } from '@/application/read-model/CandidateReadModelProjector';
import type { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import type { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { InMemoryEventBus } from './event-bus/InMemoryEventBus';
import { InMemoryCandidateReadModel } from './read-model/InMemoryCandidateReadModel';
import { PostgresCandidateReadModel } from './read-model/PostgresCandidateReadModel';
import { createPostgresPersistence } from './persistence/createPostgresPersistence';
import {
  NoopDomainEventDispatchLog,
  PostgresDomainEventDispatchLog,
} from './persistence/outbox/domainEvents';
import {
  PublishingJobApplicationRepository,
  PublishingTargetCompanyRepository,
} from './persistence/repositories/PublishingRepositories';
import { InMemoryJobApplicationRepository } from './repositories/InMemoryJobApplicationRepository';
import { InMemoryTargetCompanyRepository } from './repositories/InMemoryTargetCompanyRepository';
import { seedCandidateData } from './seeds/SeedCandidateData';

export interface CandidateRuntime {
  persistence: 'memory' | 'postgres';
  eventBus: IEventBus;
  companyRepository: ITargetCompanyRepository;
  applicationRepository: IJobApplicationRepository;
  queries: CandidateQueryService;
  useCases: CandidateUseCases;
  projector: CandidateReadModelProjector;
  prepare(): Promise<void>;
  dispatchPending(): Promise<void>;
  close(): Promise<void>;
}

export function wireCandidateRuntime(input: {
  persistence: 'memory' | 'postgres';
  companies: ITargetCompanyRepository;
  applications: IJobApplicationRepository;
  readModel: CandidateReadModel;
  dispatchLog: DomainEventDispatchLog;
  close?: () => Promise<void>;
}): CandidateRuntime {
  const eventBus = new InMemoryEventBus();
  const projector = new CandidateReadModelProjector(
    input.companies,
    input.applications,
    input.readModel
  );
  eventBus.subscribe('*', (event) => projector.onDomainEvent(event));

  const companyRepository = new PublishingTargetCompanyRepository(
    input.companies,
    eventBus,
    input.dispatchLog
  );
  const applicationRepository = new PublishingJobApplicationRepository(
    input.applications,
    eventBus,
    input.dispatchLog
  );

  return {
    persistence: input.persistence,
    eventBus,
    companyRepository,
    applicationRepository,
    queries: new CandidateQueryService(input.readModel),
    useCases: createCandidateUseCases(companyRepository, applicationRepository),
    projector,
    async prepare() {},
    async dispatchPending() {
      const pending = await input.dispatchLog.loadPending();
      if (pending.length === 0) {
        return;
      }
      await eventBus.publishAll(pending);
      await input.dispatchLog.markDispatched(pending.map((event) => event.eventId));
    },
    close: input.close ?? (async () => {}),
  };
}

export function createInMemoryCandidateRuntime(): CandidateRuntime {
  const companies = new InMemoryTargetCompanyRepository();
  const applications = new InMemoryJobApplicationRepository();
  const runtime = wireCandidateRuntime({
    persistence: 'memory',
    companies,
    applications,
    readModel: new InMemoryCandidateReadModel(),
    dispatchLog: new NoopDomainEventDispatchLog(),
  });
  return {
    ...runtime,
    async prepare() {
      await seedCandidateData(runtime.companyRepository, runtime.applicationRepository, runtime.eventBus);
      await runtime.projector.rebuild();
    },
  };
}

export async function createPostgresCandidateRuntime(
  connectionString: string
): Promise<CandidateRuntime> {
  const persistence = await createPostgresPersistence(connectionString);
  const runtime = wireCandidateRuntime({
    persistence: 'postgres',
    companies: persistence.companyRepository,
    applications: persistence.applicationRepository,
    readModel: new PostgresCandidateReadModel(persistence.db),
    dispatchLog: new PostgresDomainEventDispatchLog(persistence.db),
    close: () => persistence.db.close(),
  });
  await runtime.projector.rebuild();
  await runtime.dispatchPending();
  return runtime;
}
