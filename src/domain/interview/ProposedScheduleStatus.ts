import { Result } from '../shared/Result';
import { ValueObject } from '../shared/ValueObject';

export type ProposedScheduleStatusCode = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

const LABELS: Record<ProposedScheduleStatusCode, string> = {
  PENDING: '返答待ち',
  CONFIRMED: '確定',
  CANCELLED: '取り下げ',
  EXPIRED: '期限切れ',
};

interface ProposedScheduleStatusProps {
  code: ProposedScheduleStatusCode;
}

export class ProposedScheduleStatus extends ValueObject<ProposedScheduleStatusProps> {
  private constructor(props: ProposedScheduleStatusProps) {
    super(props);
  }

  public get code(): ProposedScheduleStatusCode {
    return this.props.code;
  }

  public get label(): string {
    return LABELS[this.props.code];
  }

  public get isPending(): boolean {
    return this.props.code === 'PENDING';
  }

  public static pending(): ProposedScheduleStatus {
    return new ProposedScheduleStatus({ code: 'PENDING' });
  }

  public static confirmed(): ProposedScheduleStatus {
    return new ProposedScheduleStatus({ code: 'CONFIRMED' });
  }

  public static cancelled(): ProposedScheduleStatus {
    return new ProposedScheduleStatus({ code: 'CANCELLED' });
  }

  public static expired(): ProposedScheduleStatus {
    return new ProposedScheduleStatus({ code: 'EXPIRED' });
  }

  public static create(code: ProposedScheduleStatusCode): Result<ProposedScheduleStatus> {
    if (!LABELS[code]) {
      return Result.fail(`不正な日程調整ステータスです: ${code}`);
    }
    return Result.ok(new ProposedScheduleStatus({ code }));
  }
}
