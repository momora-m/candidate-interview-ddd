import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export interface PositionMotivationProps {
  whyThisRole: string;
  valueProposition: string;
  careerGrowthAlignment: string;
}

export class PositionMotivation extends ValueObject<PositionMotivationProps> {
  private constructor(props: PositionMotivationProps) {
    super(props);
  }

  public get whyThisRole(): string {
    return this.props.whyThisRole;
  }

  public get valueProposition(): string {
    return this.props.valueProposition;
  }

  public get careerGrowthAlignment(): string {
    return this.props.careerGrowthAlignment;
  }

  public static create(props: {
    whyThisRole?: string;
    valueProposition?: string;
    careerGrowthAlignment?: string;
  }): Result<PositionMotivation> {
    return Result.ok(
      new PositionMotivation({
        whyThisRole: props.whyThisRole?.trim() || '',
        valueProposition: props.valueProposition?.trim() || '',
        careerGrowthAlignment: props.careerGrowthAlignment?.trim() || '',
      })
    );
  }
}
