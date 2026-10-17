import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export interface SalaryRangeProps {
  minAmount?: number;
  maxAmount?: number;
  currency: string;
}

export class SalaryRange extends ValueObject<SalaryRangeProps> {
  private constructor(props: SalaryRangeProps) {
    super(props);
  }

  public get minAmount(): number | undefined {
    return this.props.minAmount;
  }

  public get maxAmount(): number | undefined {
    return this.props.maxAmount;
  }

  public get currency(): string {
    return this.props.currency;
  }

  public static create(props: {
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
  }): Result<SalaryRange> {
    if (props.minAmount !== undefined && props.minAmount < 0) {
      return Result.fail('年収下限値は0以上である必要があります。');
    }
    if (props.maxAmount !== undefined && props.maxAmount < 0) {
      return Result.fail('年収上限値は0以上である必要があります。');
    }
    if (
      props.minAmount !== undefined &&
      props.maxAmount !== undefined &&
      props.minAmount > props.maxAmount
    ) {
      return Result.fail('年収の下限値は上限値以下である必要があります。');
    }

    return Result.ok(
      new SalaryRange({
        minAmount: props.minAmount,
        maxAmount: props.maxAmount,
        currency: props.currency || 'JPY',
      })
    );
  }

  public formatJP(): string {
    const toMan = (val?: number) => (val !== undefined ? `${Math.round(val / 10000)}万` : '');
    if (this.props.minAmount && this.props.maxAmount) {
      return `${toMan(this.props.minAmount)}〜${toMan(this.props.maxAmount)}円`;
    }
    if (this.props.minAmount) {
      return `${toMan(this.props.minAmount)}円以上`;
    }
    if (this.props.maxAmount) {
      return `〜${toMan(this.props.maxAmount)}円`;
    }
    return '条件応相談 / 未定';
  }
}
