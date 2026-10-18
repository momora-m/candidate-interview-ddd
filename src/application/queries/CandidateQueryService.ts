import type {
  DomainEventDTO,
  JobApplicationDTO,
  TargetCompanyDTO,
} from '@/application/dtos/CandidateApplicationDTOs';
import type { CandidateReadModel } from '@/application/read-model/screenReadModel';

/**
 * Reads screen DTOs from the projected read model (ADR-0012).
 * A company or application lookup is one document read, not an aggregate rebuild.
 */
export class CandidateQueryService {
  public constructor(private readonly readModel: CandidateReadModel) {}

  public listCompanies(): Promise<TargetCompanyDTO[]> {
    return this.readModel.listCompanies();
  }

  public getCompany(id: string): Promise<TargetCompanyDTO | null> {
    return this.readModel.getCompany(id);
  }

  public listApplications(): Promise<JobApplicationDTO[]> {
    return this.readModel.listApplications();
  }

  public getApplication(id: string): Promise<JobApplicationDTO | null> {
    return this.readModel.getApplication(id);
  }

  public listEvents(): Promise<DomainEventDTO[]> {
    return this.readModel.listEvents();
  }
}
