import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type PriorityLevel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

interface PriorityMeta {
  label: string;
  weight: number;
  color: string;
}

const PRIORITY_METAS: Record<PriorityLevel, PriorityMeta> = {
  URGENT: { label: '最優先 (Urgent)', weight: 4, color: '#ef4444' },
  HIGH: { label: '高 (High)', weight: 3, color: '#f97316' },
  MEDIUM: { label: '中 (Medium)', weight: 2, color: '#eab308' },
  LOW: { label: '低 (Low)', weight: 1, color: '#6b7280' },
};

interface TaskPriorityProps {
  level: PriorityLevel;
}

export class TaskPriority extends ValueObject<TaskPriorityProps> {
  private constructor(props: TaskPriorityProps) {
    super(props);
  }

  public get level(): PriorityLevel {
    return this.props.level;
  }

  public get label(): string {
    return PRIORITY_METAS[this.props.level].label;
  }

  public get weight(): number {
    return PRIORITY_METAS[this.props.level].weight;
  }

  public get color(): string {
    return PRIORITY_METAS[this.props.level].color;
  }

  public static create(level: PriorityLevel): Result<TaskPriority> {
    if (!PRIORITY_METAS[level]) {
      return Result.fail(`不正な優先度レベルです: ${level}`);
    }
    return Result.ok(new TaskPriority({ level }));
  }

  public static medium(): TaskPriority {
    return new TaskPriority({ level: 'MEDIUM' });
  }

  public static high(): TaskPriority {
    return new TaskPriority({ level: 'HIGH' });
  }

  public static urgent(): TaskPriority {
    return new TaskPriority({ level: 'URGENT' });
  }

  public toString(): string {
    return this.label;
  }
}
