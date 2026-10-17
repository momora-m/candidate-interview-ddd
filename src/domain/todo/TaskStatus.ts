import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type TaskStatusCode = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';

interface TaskStatusProps {
  code: TaskStatusCode;
}

export class TaskStatus extends ValueObject<TaskStatusProps> {
  private constructor(props: TaskStatusProps) {
    super(props);
  }

  public get code(): TaskStatusCode {
    return this.props.code;
  }

  public get isCompleted(): boolean {
    return this.props.code === 'DONE' || this.props.code === 'SKIPPED';
  }

  public get isDone(): boolean {
    return this.props.code === 'DONE';
  }

  public get label(): string {
    switch (this.props.code) {
      case 'TODO':
        return '未着手';
      case 'IN_PROGRESS':
        return '進行中';
      case 'DONE':
        return '完了';
      case 'SKIPPED':
        return 'スキップ';
    }
  }

  public static create(code: TaskStatusCode): Result<TaskStatus> {
    const validCodes: TaskStatusCode[] = ['TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED'];
    if (!validCodes.includes(code)) {
      return Result.fail(`不正なタスクステータスです: ${code}`);
    }
    return Result.ok(new TaskStatus({ code }));
  }

  public static todo(): TaskStatus {
    return new TaskStatus({ code: 'TODO' });
  }

  public static inProgress(): TaskStatus {
    return new TaskStatus({ code: 'IN_PROGRESS' });
  }

  public static done(): TaskStatus {
    return new TaskStatus({ code: 'DONE' });
  }

  public static skipped(): TaskStatus {
    return new TaskStatus({ code: 'SKIPPED' });
  }

  public toString(): string {
    return this.label;
  }
}
