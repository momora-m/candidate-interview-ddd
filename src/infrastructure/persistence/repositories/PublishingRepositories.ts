import type { DomainEventDispatchLog } from '@/application/events/DomainEventDispatchLog';
import type { IEventBus } from '@/application/events/IEventBus';
import type { JobApplication } from '@/domain/application/JobApplication';
import type { ApplicationId } from '@/domain/application/ApplicationId';
import type { TargetCompany } from '@/domain/company/TargetCompany';
import type { CompanyId } from '@/domain/company/CompanyId';
import type { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import type { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';

/**
 * Publishes domain events only after the inner repository commit returns.
 * PostgreSQL repositories insert the same events inside that commit (ADR-0012).
 */
export class PublishingTargetCompanyRepository implements ITargetCompanyRepository {
  public constructor(
    private readonly inner: ITargetCompanyRepository,
    private readonly eventBus: IEventBus,
    private readonly dispatchLog: DomainEventDispatchLog
  ) {}

  public findById(id: CompanyId): Promise<TargetCompany | null> {
    return this.inner.findById(id);
  }

  public findAll(): Promise<TargetCompany[]> {
    return this.inner.findAll();
  }

  public async save(company: TargetCompany): Promise<void> {
    const events = [...company.domainEvents];
    await this.inner.save(company);
    await this.eventBus.publishAll(events);
    await this.dispatchLog.markDispatched(events.map((event) => event.eventId));
    company.clearEvents();
  }

  public delete(id: CompanyId): Promise<void> {
    return this.inner.delete(id);
  }
}

export class PublishingJobApplicationRepository implements IJobApplicationRepository {
  public constructor(
    private readonly inner: IJobApplicationRepository,
    private readonly eventBus: IEventBus,
    private readonly dispatchLog: DomainEventDispatchLog
  ) {}

  public findById(id: ApplicationId): Promise<JobApplication | null> {
    return this.inner.findById(id);
  }

  public findByCompanyId(companyId: CompanyId): Promise<JobApplication[]> {
    return this.inner.findByCompanyId(companyId);
  }

  public findAll(): Promise<JobApplication[]> {
    return this.inner.findAll();
  }

  public async save(application: JobApplication): Promise<void> {
    const events = [...application.domainEvents];
    await this.inner.save(application);
    await this.eventBus.publishAll(events);
    await this.dispatchLog.markDispatched(events.map((event) => event.eventId));
    application.clearEvents();
  }

  public delete(id: ApplicationId): Promise<void> {
    return this.inner.delete(id);
  }
}
