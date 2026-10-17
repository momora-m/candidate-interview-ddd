import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type PerformanceRating = 1 | 2 | 3 | 4 | 5;

export interface InterviewReflectionProps {
  candidatePerformanceRating: PerformanceRating;
  companyImpressionRating: PerformanceRating;
  keyLearningsAndInsights: string;
  concernsOrRedFlags?: string;
  nextActionNotes: string;
  recordedAt: Date;
}

export class InterviewReflection extends ValueObject<InterviewReflectionProps> {
  private constructor(props: InterviewReflectionProps) {
    super(props);
  }

  public get candidatePerformanceRating(): PerformanceRating {
    return this.props.candidatePerformanceRating;
  }

  public get companyImpressionRating(): PerformanceRating {
    return this.props.companyImpressionRating;
  }

  public get keyLearningsAndInsights(): string {
    return this.props.keyLearningsAndInsights;
  }

  public get concernsOrRedFlags(): string | undefined {
    return this.props.concernsOrRedFlags;
  }

  public get nextActionNotes(): string {
    return this.props.nextActionNotes;
  }

  public get recordedAt(): Date {
    return this.props.recordedAt;
  }

  public static create(props: {
    candidatePerformanceRating: PerformanceRating;
    companyImpressionRating: PerformanceRating;
    keyLearningsAndInsights: string;
    concernsOrRedFlags?: string;
    nextActionNotes: string;
    recordedAt?: Date;
  }): Result<InterviewReflection> {
    if (!props.keyLearningsAndInsights || props.keyLearningsAndInsights.trim().length < 5) {
      return Result.fail('面接の学び・得られた情報（Learnings）を5文字以上で記入してください。');
    }

    if (!props.nextActionNotes || props.nextActionNotes.trim().length < 3) {
      return Result.fail('次回へのアクションや留意事項（Next Actions）を記入してください。');
    }

    return Result.ok(
      new InterviewReflection({
        candidatePerformanceRating: props.candidatePerformanceRating,
        companyImpressionRating: props.companyImpressionRating,
        keyLearningsAndInsights: props.keyLearningsAndInsights.trim(),
        concernsOrRedFlags: props.concernsOrRedFlags?.trim(),
        nextActionNotes: props.nextActionNotes.trim(),
        recordedAt: props.recordedAt || new Date(),
      })
    );
  }
}
