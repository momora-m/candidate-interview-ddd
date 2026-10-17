import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

interface TimeWindowProps {
  start: Date;
  end: Date;
}

export class TimeWindow extends ValueObject<TimeWindowProps> {
  public static readonly MIN_DURATION_MINUTES = 15;
  public static readonly MAX_DURATION_MINUTES = 360;

  private constructor(props: TimeWindowProps) {
    super(props);
  }

  public get start(): Date {
    return new Date(this.props.start.getTime());
  }

  public get end(): Date {
    return new Date(this.props.end.getTime());
  }

  public get durationMinutes(): number {
    return Math.round((this.props.end.getTime() - this.props.start.getTime()) / (1000 * 60));
  }

  public static create(
    start: Date | string | number,
    end: Date | string | number
  ): Result<TimeWindow> {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime())) {
      return Result.fail('開始日時が不正な日付フォーマットです。');
    }

    if (isNaN(endDate.getTime())) {
      return Result.fail('終了日時が不正な日付フォーマットです。');
    }

    if (startDate >= endDate) {
      return Result.fail('面接の開始日時は終了日時よりも前でなければなりません。');
    }

    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    if (durationMinutes < this.MIN_DURATION_MINUTES) {
      return Result.fail(
        `面接時間は最低 ${this.MIN_DURATION_MINUTES} 分以上必要です（現在: ${durationMinutes} 分）。`
      );
    }

    if (durationMinutes > this.MAX_DURATION_MINUTES) {
      return Result.fail(
        `面接時間は最大 ${this.MAX_DURATION_MINUTES} 分以内で設定してください（現在: ${durationMinutes} 分）。`
      );
    }

    return Result.ok(new TimeWindow({ start: startDate, end: endDate }));
  }

  /**
   * Standard interval overlap: [A.start, A.end) overlaps with [B.start, B.end)
   */
  public overlapsWith(other: TimeWindow): boolean {
    return this.props.start < other.props.end && other.props.start < this.props.end;
  }

  /**
   * Overlap calculation taking travel/prep buffers into account.
   */
  public overlapsWithBuffers(
    other: TimeWindow,
    bufferMinutesSelf: number = 0,
    bufferMinutesOther: number = 0
  ): boolean {
    const selfEffectiveStart = new Date(this.props.start.getTime() - bufferMinutesSelf * 60 * 1000);
    const selfEffectiveEnd = new Date(this.props.end.getTime() + bufferMinutesSelf * 60 * 1000);

    const otherEffectiveStart = new Date(other.props.start.getTime() - bufferMinutesOther * 60 * 1000);
    const otherEffectiveEnd = new Date(other.props.end.getTime() + bufferMinutesOther * 60 * 1000);

    return selfEffectiveStart < otherEffectiveEnd && otherEffectiveStart < selfEffectiveEnd;
  }

  public isOngoing(at: Date = new Date()): boolean {
    return this.props.start <= at && at <= this.props.end;
  }

  public isPast(at: Date = new Date()): boolean {
    return this.props.end < at;
  }

  public isFuture(at: Date = new Date()): boolean {
    return this.props.start > at;
  }

  public formatJP(): string {
    const d = this.props.start;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const startHour = String(d.getHours()).padStart(2, '0');
    const startMin = String(d.getMinutes()).padStart(2, '0');

    const endHour = String(this.props.end.getHours()).padStart(2, '0');
    const endMin = String(this.props.end.getMinutes()).padStart(2, '0');

    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

    return `${year}/${month}/${day}(${dayOfWeek}) ${startHour}:${startMin}〜${endHour}:${endMin} (${this.durationMinutes}分)`;
  }
}
