import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type TargetAudience =
  | 'B2B_ENTERPRISE'
  | 'B2B_SMB'
  | 'B2C'
  | 'C2C'
  | 'INTERNAL_PLATFORM';

export interface BusinessModelProps {
  productSummary: string;
  targetAudience: TargetAudience;
  revenueStream: string;
  keyCompetitors: string[];
}

export class BusinessModel extends ValueObject<BusinessModelProps> {
  private constructor(props: BusinessModelProps) {
    super(props);
  }

  public get productSummary(): string {
    return this.props.productSummary;
  }

  public get targetAudience(): TargetAudience {
    return this.props.targetAudience;
  }

  public get revenueStream(): string {
    return this.props.revenueStream;
  }

  public get keyCompetitors(): ReadonlyArray<string> {
    return this.props.keyCompetitors;
  }

  public static create(props: {
    productSummary: string;
    targetAudience: TargetAudience;
    revenueStream: string;
    keyCompetitors?: string[];
  }): Result<BusinessModel> {
    if (!props.productSummary || props.productSummary.trim().length === 0) {
      return Result.fail('プロダクト・事業概要は必須です。');
    }

    if (!props.revenueStream || props.revenueStream.trim().length === 0) {
      return Result.fail('収益モデル・マネタイズ構造は必須です。');
    }

    return Result.ok(
      new BusinessModel({
        productSummary: props.productSummary.trim(),
        targetAudience: props.targetAudience,
        revenueStream: props.revenueStream.trim(),
        keyCompetitors: (props.keyCompetitors || []).map((c) => c.trim()).filter(Boolean),
      })
    );
  }
}
