import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

interface ApplicationIdProps {
  value: string;
}

export class ApplicationId extends ValueObject<ApplicationIdProps> {
  private constructor(props: ApplicationIdProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(id?: string): Result<ApplicationId> {
    if (id !== undefined) {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return Result.fail('ApplicationId は空にできません。');
      }
      return Result.ok(new ApplicationId({ value: id.trim() }));
    }

    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return Result.ok(new ApplicationId({ value: generated }));
  }

  public toString(): string {
    return this.value;
  }
}
