import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { TargetCompany } from '@/domain/company/TargetCompany';
import { Result } from '@/domain/shared/Result';
import {
  companyProfileFromCommand,
  type CompanyProfileCommand,
} from '../companyProfileFromCommand';

export interface CreateTargetCompanyCommand extends CompanyProfileCommand {
  name: string;
}

export class CreateTargetCompanyUseCase {
  constructor(
    private readonly companyRepo: ITargetCompanyRepository,
  ) {}

  public async execute(command: CreateTargetCompanyCommand): Promise<Result<TargetCompany>> {
    const profile = companyProfileFromCommand(command);
    if (profile.isFailure()) return Result.fail(profile.getError());

    const company = TargetCompany.create({
      name: command.name,
      profile: profile.getValue(),
    });
    if (company.isFailure()) return Result.fail(company.getError());

    const created = company.getValue();
    await this.companyRepo.save(created);
    return Result.ok(created);
  }
}
