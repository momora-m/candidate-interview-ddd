import type {
  DomainEventDTO,
  JobApplicationDTO,
  TargetCompanyDTO,
} from '@/application/dtos/CandidateApplicationDTOs';

/**
 * Query-side store. Screens read these documents and do not rehydrate aggregates.
 */
export interface CandidateReadModel {
  listCompanies(): Promise<TargetCompanyDTO[]>;
  getCompany(id: string): Promise<TargetCompanyDTO | null>;
  listApplications(): Promise<JobApplicationDTO[]>;
  getApplication(id: string): Promise<JobApplicationDTO | null>;
  listEvents(): Promise<DomainEventDTO[]>;
  replaceAll(snapshot: {
    companies: readonly TargetCompanyDTO[];
    applications: readonly JobApplicationDTO[];
  }): Promise<void>;
  upsertCompany(company: TargetCompanyDTO): Promise<void>;
  upsertApplication(application: JobApplicationDTO): Promise<void>;
  removeCompany(id: string): Promise<void>;
  removeApplication(id: string): Promise<void>;
  appendEvent(event: DomainEventDTO): Promise<void>;
}
