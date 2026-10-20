import { Entity } from '../shared/Entity';
import { Result } from '../shared/Result';
import { InterviewSessionId } from './InterviewSessionId';
import { SelectionStage } from '../application/SelectionStage';
import { TimeWindow } from './TimeWindow';
import { InterviewFormat } from './InterviewFormat';
import { AssignedReverseQuestion, InsightRating } from './AssignedReverseQuestion';
import { InterviewReflection } from './InterviewReflection';

export interface InterviewSessionProps {
  id: InterviewSessionId;
  stage: SelectionStage;
  timeWindow: TimeWindow;
  format: InterviewFormat;
  interviewerNames: string[];
  assignedQuestions: AssignedReverseQuestion[];
  reflection?: InterviewReflection;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class InterviewSession extends Entity<InterviewSessionId> {
  private _stage: SelectionStage;
  private _timeWindow: TimeWindow;
  private _format: InterviewFormat;
  private _interviewerNames: string[];
  private _assignedQuestions: AssignedReverseQuestion[];
  private _reflection?: InterviewReflection;
  private _isCompleted: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InterviewSessionProps) {
    super(props.id);
    this._stage = props.stage;
    this._timeWindow = props.timeWindow;
    this._format = props.format;
    this._interviewerNames = props.interviewerNames;
    this._assignedQuestions = props.assignedQuestions;
    this._reflection = props.reflection;
    this._isCompleted = props.isCompleted;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get stage(): SelectionStage {
    return this._stage;
  }

  public get timeWindow(): TimeWindow {
    return this._timeWindow;
  }

  public get format(): InterviewFormat {
    return this._format;
  }

  public get interviewerNames(): ReadonlyArray<string> {
    return this._interviewerNames;
  }

  public get assignedQuestions(): ReadonlyArray<AssignedReverseQuestion> {
    return this._assignedQuestions;
  }

  public get reflection(): InterviewReflection | undefined {
    return this._reflection;
  }

  public get isCompleted(): boolean {
    return this._isCompleted;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(props: {
    id?: InterviewSessionId;
    stage: SelectionStage;
    timeWindow: TimeWindow;
    format: InterviewFormat;
    interviewerNames?: string[];
    assignedQuestions?: AssignedReverseQuestion[];
  }): Result<InterviewSession> {
    const id = props.id || InterviewSessionId.create().getValue();
    const now = new Date();

    return Result.ok(
      new InterviewSession({
        id,
        stage: props.stage,
        timeWindow: props.timeWindow,
        format: props.format,
        interviewerNames: (props.interviewerNames || []).map((n) => n.trim()).filter(Boolean),
        assignedQuestions: props.assignedQuestions || [],
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  public static hydrate(props: InterviewSessionProps): InterviewSession {
    return new InterviewSession(props);
  }

  public reschedule(newTimeWindow: TimeWindow): Result<void> {
    if (this._isCompleted) {
      return Result.fail('完了済みの面接セッションの日程を変更することはできません。');
    }
    this._timeWindow = newTimeWindow;
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public reviseArrangement(props: {
    timeWindow: TimeWindow;
    format: InterviewFormat;
    interviewerNames: readonly string[];
  }): Result<void> {
    if (this._isCompleted) {
      return Result.fail('完了済みの面接セッションは訂正できません。');
    }
    this._timeWindow = props.timeWindow;
    this._format = props.format;
    this._interviewerNames = props.interviewerNames.map((name) => name.trim()).filter(Boolean);
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public assignQuestion(question: AssignedReverseQuestion): Result<void> {
    const existing = this._assignedQuestions.find((q) => q.id === question.id);
    if (existing) {
      return Result.fail('この逆質問は既にこの面接に割り当てられています。');
    }

    this._assignedQuestions.push(question);
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public removeAssignedQuestion(questionId: string): Result<void> {
    this._assignedQuestions = this._assignedQuestions.filter((q) => q.id !== questionId);
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public recordQuestionAnswer(
    questionId: string,
    answer: string,
    rating?: InsightRating
  ): Result<void> {
    const index = this._assignedQuestions.findIndex((q) => q.id === questionId);
    if (index === -1) {
      return Result.fail(`ID: ${questionId} の逆質問が見つかりません。`);
    }

    const current = this._assignedQuestions[index];
    this._assignedQuestions[index] = current.recordAnswer(answer, rating);
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public recordReflection(reflection: InterviewReflection): Result<void> {
    this._reflection = reflection;
    this._isCompleted = true;
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public markCompleted(): void {
    this._isCompleted = true;
    this._updatedAt = new Date();
  }
}
