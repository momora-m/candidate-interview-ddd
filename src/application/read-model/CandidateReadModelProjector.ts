import type { CandidateReadModel } from '@/application/read-model/screenReadModel';
import {
  toApplicationDTO,
  toCompanyDTO,
  toEventDTO,
} from '@/application/read-model/candidateReadModel';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { CompanyId } from '@/domain/company/CompanyId';
import type { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import type { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import type { IDomainEvent } from '@/domain/shared/DomainEvent';

const COMPANY_EVENT_TYPES = new Set([
  'TARGET_COMPANY_REGISTERED',
  'TARGET_COMPANY_REVISED',
  'STOCKED_REVERSE_QUESTION_ADDED',
  'STOCKED_REVERSE_QUESTION_REMOVED',
]);

/**
 * Folds committed domain events into the screen read model.
 * The handler reloads the write model once per event; queries never do.
 */
export class CandidateReadModelProjector {
  public constructor(
    private readonly companies: ITargetCompanyRepository,
    private readonly applications: IJobApplicationRepository,
    private readonly readModel: CandidateReadModel
  ) {}

  public async onDomainEvent(event: IDomainEvent): Promise<void> {
    await this.readModel.appendEvent(toEventDTO(event));
    if (COMPANY_EVENT_TYPES.has(event.eventType)) {
      await this.projectCompany(event.aggregateId);
      return;
    }
    await this.projectApplication(event.aggregateId);
  }

  public async rebuild(): Promise<void> {
    const companies = await this.companies.findAll();
    const names = new Map(companies.map((company) => [company.id.value, company.name]));
    const applications = await this.applications.findAll();
    await this.readModel.replaceAll({
      companies: companies.map(toCompanyDTO),
      applications: applications.map((application) =>
        toApplicationDTO(application, names.get(application.companyId.value))
      ),
    });
  }

  private async projectCompany(id: string): Promise<void> {
    const companyId = CompanyId.create(id);
    if (companyId.isFailure()) {
      return;
    }
    const company = await this.companies.findById(companyId.getValue());
    if (!company) {
      await this.readModel.removeCompany(id);
      return;
    }
    await this.readModel.upsertCompany(toCompanyDTO(company));
    const applications = await this.applications.findByCompanyId(company.id);
    for (const application of applications) {
      await this.readModel.upsertApplication(toApplicationDTO(application, company.name));
    }
  }

  private async projectApplication(id: string): Promise<void> {
    const applicationId = ApplicationId.create(id);
    if (applicationId.isFailure()) {
      return;
    }
    const application = await this.applications.findById(applicationId.getValue());
    if (!application) {
      await this.readModel.removeApplication(id);
      return;
    }
    const company = await this.companies.findById(application.companyId);
    await this.readModel.upsertApplication(
      toApplicationDTO(application, company?.name)
    );
  }
}
