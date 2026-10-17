import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';
import { SalaryRange } from './SalaryRange';

export type DesirabilityRating = 1 | 2 | 3 | 4 | 5;

export interface PositionDetailsProps {
  title: string;
  jobDescriptionUrl?: string;
  expectedSalaryRange: SalaryRange;
  targetSeniority?: string;
  desirabilityRating: DesirabilityRating;
}

export class PositionDetails extends ValueObject<PositionDetailsProps> {
  private constructor(props: PositionDetailsProps) {
    super(props);
  }

  public get title(): string {
    return this.props.title;
  }

  public get jobDescriptionUrl(): string | undefined {
    return this.props.jobDescriptionUrl;
  }

  public get expectedSalaryRange(): SalaryRange {
    return this.props.expectedSalaryRange;
  }

  public get targetSeniority(): string | undefined {
    return this.props.targetSeniority;
  }

  public get desirabilityRating(): DesirabilityRating {
    return this.props.desirabilityRating;
  }

  public static create(props: {
    title: string;
    jobDescriptionUrl?: string;
    expectedSalaryRange?: SalaryRange;
    targetSeniority?: string;
    desirabilityRating?: DesirabilityRating;
  }): Result<PositionDetails> {
    if (!props.title || props.title.trim().length === 0) {
      return Result.fail('ポジション・職種名は必須です。');
    }

    const salaryRange =
      props.expectedSalaryRange || SalaryRange.create({}).getValue();

    return Result.ok(
      new PositionDetails({
        title: props.title.trim(),
        jobDescriptionUrl: props.jobDescriptionUrl?.trim(),
        expectedSalaryRange: salaryRange,
        targetSeniority: props.targetSeniority?.trim(),
        desirabilityRating: props.desirabilityRating || 3,
      })
    );
  }
}
