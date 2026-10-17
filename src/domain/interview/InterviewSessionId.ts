import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

interface InterviewSessionIdProps {
  value: string;
}

export class InterviewSessionId extends ValueObject<InterviewSessionIdProps> {
  private constructor(props: InterviewSessionIdProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(id?: string): Result<InterviewSessionId> {
    if (id !== undefined) {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return Result.fail('InterviewSessionId は空にできません。');
      }
      return Result.ok(new InterviewSessionId({ value: id.trim() }));
    }

    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `intv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return Result.ok(new InterviewSessionId({ value: generated }));
  }

  public toString(): string {
    return this.value;
  }
}
