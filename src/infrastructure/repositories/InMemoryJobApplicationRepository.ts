import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { JobApplication } from '@/domain/application/JobApplication';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { CompanyId } from '@/domain/company/CompanyId';

export class InMemoryJobApplicationRepository implements IJobApplicationRepository {
  private applications: Map<string, JobApplication> = new Map();

  public async findById(id: ApplicationId): Promise<JobApplication | null> {
    return this.applications.get(id.value) || null;
  }

  public async findByCompanyId(companyId: CompanyId): Promise<JobApplication[]> {
    return Array.from(this.applications.values()).filter((a) => a.companyId.equals(companyId));
  }

  public async findAll(): Promise<JobApplication[]> {
    return Array.from(this.applications.values());
  }

  public async save(application: JobApplication): Promise<void> {
    this.applications.set(application.id.value, application);
  }

  public async delete(id: ApplicationId): Promise<void> {
    this.applications.delete(id.value);
  }

  public clear(): void {
    this.applications.clear();
  }
}
