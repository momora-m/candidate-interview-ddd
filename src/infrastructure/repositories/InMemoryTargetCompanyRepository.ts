import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { TargetCompany } from '@/domain/company/TargetCompany';
import { CompanyId } from '@/domain/company/CompanyId';

export class InMemoryTargetCompanyRepository implements ITargetCompanyRepository {
  private companies: Map<string, TargetCompany> = new Map();

  public async findById(id: CompanyId): Promise<TargetCompany | null> {
    return this.companies.get(id.value) || null;
  }

  public async findAll(): Promise<TargetCompany[]> {
    return Array.from(this.companies.values());
  }

  public async save(company: TargetCompany): Promise<void> {
    this.companies.set(company.id.value, company);
  }

  public async delete(id: CompanyId): Promise<void> {
    this.companies.delete(id.value);
  }

  public clear(): void {
    this.companies.clear();
  }
}
