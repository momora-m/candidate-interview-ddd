import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';
import { BusinessModel } from './BusinessModel';
import { TechStackProfile } from './TechStackProfile';

export interface CompanyProfileProps {
  businessModel: BusinessModel;
  techStack: TechStackProfile;
  overallAttractivenessSummary?: string;
  corporateMission?: string;
}

export class CompanyProfile extends ValueObject<CompanyProfileProps> {
  private constructor(props: CompanyProfileProps) {
    super(props);
  }

  public get businessModel(): BusinessModel {
    return this.props.businessModel;
  }

  public get techStack(): TechStackProfile {
    return this.props.techStack;
  }

  public get overallAttractivenessSummary(): string | undefined {
    return this.props.overallAttractivenessSummary;
  }

  public get corporateMission(): string | undefined {
    return this.props.corporateMission;
  }

  public static create(props: {
    businessModel: BusinessModel;
    techStack: TechStackProfile;
    overallAttractivenessSummary?: string;
    corporateMission?: string;
  }): Result<CompanyProfile> {
    return Result.ok(
      new CompanyProfile({
        businessModel: props.businessModel,
        techStack: props.techStack,
        overallAttractivenessSummary: props.overallAttractivenessSummary?.trim(),
        corporateMission: props.corporateMission?.trim(),
      })
    );
  }
}
