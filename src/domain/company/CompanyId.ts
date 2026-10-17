import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

interface CompanyIdProps {
  value: string;
}

export class CompanyId extends ValueObject<CompanyIdProps> {
  private constructor(props: CompanyIdProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(id?: string): Result<CompanyId> {
    if (id !== undefined) {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return Result.fail('CompanyId は空にできません。');
      }
      return Result.ok(new CompanyId({ value: id.trim() }));
    }

    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return Result.ok(new CompanyId({ value: generated }));
  }

  public toString(): string {
    return this.value;
  }
}
