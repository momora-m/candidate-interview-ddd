import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { CompanyId } from '@/domain/company/CompanyId';
import { TargetCompany } from '@/domain/company/TargetCompany';
import { Result } from '@/domain/shared/Result';
import { companyProfileFromCommand } from '../companyProfileFromCommand';
import type { CreateTargetCompanyCommand } from './CreateTargetCompanyUseCase';

export interface ReviseTargetCompanyCommand extends CreateTargetCompanyCommand {
  companyId: string;
}

export class ReviseTargetCompanyUseCase {
  constructor(private readonly companyRepo: ITargetCompanyRepository) {}

  public async execute(command: ReviseTargetCompanyCommand): Promise<Result<TargetCompany>> {
    const id = CompanyId.create(command.companyId);
    if (id.isFailure()) return Result.fail(id.getError());

    const company = await this.companyRepo.findById(id.getValue());
    if (!company) {
      return Result.fail(`企業 (ID: ${command.companyId}) が見つかりません。`);
    }

    const profile = companyProfileFromCommand(command);
    if (profile.isFailure()) return Result.fail(profile.getError());

    const revised = company.revise(command.name, profile.getValue());
    if (revised.isFailure()) return Result.fail(revised.getError());

    await this.companyRepo.save(company);
    return Result.ok(company);
  }
}
