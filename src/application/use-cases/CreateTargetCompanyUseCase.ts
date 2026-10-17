import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { IEventBus } from '../events/IEventBus';
import { TargetCompany } from '@/domain/company/TargetCompany';
import { CompanyProfile } from '@/domain/company/CompanyProfile';
import { BusinessModel, TargetAudience } from '@/domain/company/BusinessModel';
import { TechStackProfile, CloudPlatformType } from '@/domain/company/TechStackProfile';
import { StockedReverseQuestion } from '@/domain/company/StockedReverseQuestion';
import { Result } from '@/domain/shared/Result';

export interface CreateTargetCompanyCommand {
  name: string;
  productSummary: string;
  targetAudience: TargetAudience;
  revenueStream: string;
  keyCompetitors?: string[];
  primaryLanguages: string[];
  cloudPlatform?: CloudPlatformType;
  architectureHighlights?: string[];
  techBlogUrls?: string[];
  overallAttractivenessSummary?: string;
  corporateMission?: string;
}

export class CreateTargetCompanyUseCase {
  constructor(
    private readonly companyRepo: ITargetCompanyRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: CreateTargetCompanyCommand): Promise<Result<TargetCompany>> {
    const bizRes = BusinessModel.create({
      productSummary: command.productSummary,
      targetAudience: command.targetAudience,
      revenueStream: command.revenueStream,
      keyCompetitors: command.keyCompetitors,
    });
    if (bizRes.isFailure()) return Result.fail(bizRes.getError());

    const techRes = TechStackProfile.create({
      primaryLanguages: command.primaryLanguages,
      cloudPlatform: command.cloudPlatform,
      architectureHighlights: command.architectureHighlights,
      techBlogUrls: command.techBlogUrls,
    });
    if (techRes.isFailure()) return Result.fail(techRes.getError());

    const profileRes = CompanyProfile.create({
      businessModel: bizRes.getValue(),
      techStack: techRes.getValue(),
      overallAttractivenessSummary: command.overallAttractivenessSummary,
      corporateMission: command.corporateMission,
    });
    if (profileRes.isFailure()) return Result.fail(profileRes.getError());

    const companyRes = TargetCompany.create({
      name: command.name,
      profile: profileRes.getValue(),
    });
    if (companyRes.isFailure()) return Result.fail(companyRes.getError());

    const company = companyRes.getValue();
    await this.companyRepo.save(company);
    await this.eventBus.publishAll(company.domainEvents);
    company.clearEvents();

    return Result.ok(company);
  }
}
