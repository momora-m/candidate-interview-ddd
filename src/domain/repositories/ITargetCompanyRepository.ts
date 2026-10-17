import { TargetCompany } from '../company/TargetCompany';
import { CompanyId } from '../company/CompanyId';

export interface ITargetCompanyRepository {
  findById(id: CompanyId): Promise<TargetCompany | null>;
  findAll(): Promise<TargetCompany[]>;
  save(company: TargetCompany): Promise<void>;
  delete(id: CompanyId): Promise<void>;
}
