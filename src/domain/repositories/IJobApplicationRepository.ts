import { JobApplication } from '../application/JobApplication';
import { ApplicationId } from '../application/ApplicationId';
import { CompanyId } from '../company/CompanyId';

export interface IJobApplicationRepository {
  findById(id: ApplicationId): Promise<JobApplication | null>;
  findByCompanyId(companyId: CompanyId): Promise<JobApplication[]>;
  findAll(): Promise<JobApplication[]>;
  save(application: JobApplication): Promise<void>;
  delete(id: ApplicationId): Promise<void>;
}
