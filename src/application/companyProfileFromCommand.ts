import { CompanyProfile } from '@/domain/company/CompanyProfile';
import { BusinessModel, TargetAudience } from '@/domain/company/BusinessModel';
import { CloudPlatformType, TechStackProfile } from '@/domain/company/TechStackProfile';
import { Result } from '@/domain/shared/Result';

export interface CompanyProfileCommand {
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

export function companyProfileFromCommand(
  command: CompanyProfileCommand
): Result<CompanyProfile> {
  const business = BusinessModel.create({
    productSummary: command.productSummary,
    targetAudience: command.targetAudience,
    revenueStream: command.revenueStream,
    keyCompetitors: command.keyCompetitors,
  });
  if (business.isFailure()) return Result.fail(business.getError());

  const tech = TechStackProfile.create({
    primaryLanguages: command.primaryLanguages,
    cloudPlatform: command.cloudPlatform,
    architectureHighlights: command.architectureHighlights,
    techBlogUrls: command.techBlogUrls,
  });
  if (tech.isFailure()) return Result.fail(tech.getError());

  return CompanyProfile.create({
    businessModel: business.getValue(),
    techStack: tech.getValue(),
    overallAttractivenessSummary: command.overallAttractivenessSummary,
    corporateMission: command.corporateMission,
  });
}
