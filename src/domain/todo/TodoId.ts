import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

interface TodoIdProps {
  value: string;
}

export class TodoId extends ValueObject<TodoIdProps> {
  private constructor(props: TodoIdProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(id?: string): Result<TodoId> {
    if (id !== undefined) {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return Result.fail('TodoId は空にできません。');
      }
      return Result.ok(new TodoId({ value: id.trim() }));
    }

    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `todo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return Result.ok(new TodoId({ value: generated }));
  }

  public toString(): string {
    return this.value;
  }
}
