import { Result } from '../shared/Result';
import { ValueObject } from '../shared/ValueObject';

interface ProposedScheduleIdProps {
  value: string;
}

export class ProposedScheduleId extends ValueObject<ProposedScheduleIdProps> {
  private constructor(props: ProposedScheduleIdProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(id?: string): Result<ProposedScheduleId> {
    if (id !== undefined) {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return Result.fail('ProposedScheduleId は空にできません。');
      }
      return Result.ok(new ProposedScheduleId({ value: id.trim() }));
    }

    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `prop_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return Result.ok(new ProposedScheduleId({ value: generated }));
  }

  public toString(): string {
    return this.value;
  }
}
