import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';
import { QuestionCategory, StockedReverseQuestion } from '../company/StockedReverseQuestion';

export type InsightRating = 1 | 2 | 3 | 4 | 5;

export interface AssignedReverseQuestionProps {
  id: string;
  sourceQuestionId?: string;
  category: QuestionCategory;
  customizedQuestionText: string;
  isAsked: boolean;
  obtainedAnswer?: string;
  insightRating?: InsightRating;
}

export class AssignedReverseQuestion extends ValueObject<AssignedReverseQuestionProps> {
  private constructor(props: AssignedReverseQuestionProps) {
    super(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get sourceQuestionId(): string | undefined {
    return this.props.sourceQuestionId;
  }

  public get category(): QuestionCategory {
    return this.props.category;
  }

  public get customizedQuestionText(): string {
    return this.props.customizedQuestionText;
  }

  public get isAsked(): boolean {
    return this.props.isAsked;
  }

  public get obtainedAnswer(): string | undefined {
    return this.props.obtainedAnswer;
  }

  public get insightRating(): InsightRating | undefined {
    return this.props.insightRating;
  }

  /**
   * Factory method copying from a stocked master question into an assigned snapshot VO
   */
  public static fromStocked(
    stocked: StockedReverseQuestion,
    customizedText?: string
  ): AssignedReverseQuestion {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `assigned_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return new AssignedReverseQuestion({
      id,
      sourceQuestionId: stocked.id,
      category: stocked.category,
      customizedQuestionText: customizedText?.trim() || stocked.questionText,
      isAsked: false,
    });
  }

  public static create(props: {
    id?: string;
    sourceQuestionId?: string;
    category: QuestionCategory;
    customizedQuestionText: string;
    isAsked?: boolean;
    obtainedAnswer?: string;
    insightRating?: InsightRating;
  }): Result<AssignedReverseQuestion> {
    if (!props.customizedQuestionText || props.customizedQuestionText.trim().length === 0) {
      return Result.fail('質問文は必須です。');
    }

    const id =
      props.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `assigned_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    return Result.ok(
      new AssignedReverseQuestion({
        id,
        sourceQuestionId: props.sourceQuestionId,
        category: props.category,
        customizedQuestionText: props.customizedQuestionText.trim(),
        isAsked: props.isAsked ?? false,
        obtainedAnswer: props.obtainedAnswer?.trim(),
        insightRating: props.insightRating,
      })
    );
  }

  public recordAnswer(answer: string, rating?: InsightRating): AssignedReverseQuestion {
    return new AssignedReverseQuestion({
      ...this.props,
      isAsked: true,
      obtainedAnswer: answer.trim(),
      insightRating: rating,
    });
  }
}
