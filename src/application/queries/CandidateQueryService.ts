import type { IEventBus } from '@/application/events/IEventBus';
import type {
  DomainEventDTO,
  JobApplicationDTO,
  TargetCompanyDTO,
} from '@/application/dtos/CandidateApplicationDTOs';
import {
  toApplicationDTO,
  toCompanyDTO,
  toEventDTO,
} from '@/application/read-model/candidateReadModel';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { CompanyId } from '@/domain/company/CompanyId';
import type { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import type { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';

export class CandidateQueryService {
  public constructor(
    private readonly companies: ITargetCompanyRepository,
    private readonly applications: IJobApplicationRepository,
    private readonly events: IEventBus
  ) {}

  public async listCompanies(): Promise<TargetCompanyDTO[]> {
    const companies = await this.companies.findAll();
    return companies.map(toCompanyDTO);
  }

  public async getCompany(id: string): Promise<TargetCompanyDTO | null> {
    const companyId = CompanyId.create(id);
    if (companyId.isFailure()) {
      return null;
    }
    const company = await this.companies.findById(companyId.getValue());
    return company ? toCompanyDTO(company) : null;
  }

  public async listApplications(): Promise<JobApplicationDTO[]> {
    return this.mapApplications(await this.applications.findAll());
  }

  public async getApplication(id: string): Promise<JobApplicationDTO | null> {
    const applicationId = ApplicationId.create(id);
    if (applicationId.isFailure()) {
      return null;
    }
    const application = await this.applications.findById(applicationId.getValue());
    if (!application) {
      return null;
    }
    const [dto] = await this.mapApplications([application]);
    return dto ?? null;
  }

  public listEvents(): DomainEventDTO[] {
    return this.events.getHistory().map(toEventDTO);
  }

  private async mapApplications(
    applications: Awaited<ReturnType<IJobApplicationRepository['findAll']>>
  ): Promise<JobApplicationDTO[]> {
    const companies = await this.companies.findAll();
    const names = new Map(companies.map((company) => [company.id.value, company.name]));
    return applications.map((application) =>
      toApplicationDTO(application, names.get(application.companyId.value))
    );
  }
}
