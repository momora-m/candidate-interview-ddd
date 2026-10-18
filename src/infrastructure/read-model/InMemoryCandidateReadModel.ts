import type {
  DomainEventDTO,
  JobApplicationDTO,
  TargetCompanyDTO,
} from '@/application/dtos/CandidateApplicationDTOs';
import type { CandidateReadModel } from '@/application/read-model/screenReadModel';

const EVENT_LIMIT = 200;

export class InMemoryCandidateReadModel implements CandidateReadModel {
  private companies = new Map<string, TargetCompanyDTO>();
  private applications = new Map<string, JobApplicationDTO>();
  private events: DomainEventDTO[] = [];

  public async listCompanies(): Promise<TargetCompanyDTO[]> {
    return [...this.companies.values()].sort(byCreatedAt);
  }

  public async getCompany(id: string): Promise<TargetCompanyDTO | null> {
    return this.companies.get(id) ?? null;
  }

  public async listApplications(): Promise<JobApplicationDTO[]> {
    return [...this.applications.values()].sort(byCreatedAt);
  }

  public async getApplication(id: string): Promise<JobApplicationDTO | null> {
    return this.applications.get(id) ?? null;
  }

  public async listEvents(): Promise<DomainEventDTO[]> {
    return [...this.events];
  }

  public async replaceAll(snapshot: {
    companies: readonly TargetCompanyDTO[];
    applications: readonly JobApplicationDTO[];
  }): Promise<void> {
    this.companies = new Map(snapshot.companies.map((company) => [company.id, company]));
    this.applications = new Map(
      snapshot.applications.map((application) => [application.id, application])
    );
  }

  public async upsertCompany(company: TargetCompanyDTO): Promise<void> {
    this.companies.set(company.id, company);
  }

  public async upsertApplication(application: JobApplicationDTO): Promise<void> {
    this.applications.set(application.id, application);
  }

  public async removeCompany(id: string): Promise<void> {
    this.companies.delete(id);
  }

  public async removeApplication(id: string): Promise<void> {
    this.applications.delete(id);
  }

  public async appendEvent(event: DomainEventDTO): Promise<void> {
    if (this.events.some((existing) => existing.eventId === event.eventId)) {
      return;
    }
    this.events.unshift(event);
    if (this.events.length > EVENT_LIMIT) {
      this.events.length = EVENT_LIMIT;
    }
  }
}

function byCreatedAt(left: { createdAt: string; id: string }, right: { createdAt: string; id: string }): number {
  if (left.createdAt === right.createdAt) {
    return left.id.localeCompare(right.id);
  }
  return left.createdAt < right.createdAt ? -1 : 1;
}
