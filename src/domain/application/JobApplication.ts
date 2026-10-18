import { AggregateRoot } from '../shared/AggregateRoot';
import { Result } from '../shared/Result';
import { ApplicationId } from './ApplicationId';
import { CompanyId } from '../company/CompanyId';
import { PositionDetails } from './PositionDetails';
import { PositionMotivation } from './PositionMotivation';
import { SelectionStage, StageCode } from './SelectionStage';
import { ApplicationStatus, ApplicationStatusCode } from './ApplicationStatus';
import { InterviewSession } from '../interview/InterviewSession';
import { InterviewSessionId } from '../interview/InterviewSessionId';
import { ProposedSchedule } from '../interview/ProposedSchedule';
import { ProposedScheduleId } from '../interview/ProposedScheduleId';
import { TimeWindow } from '../interview/TimeWindow';
import { InterviewFormat } from '../interview/InterviewFormat';
import { StockedReverseQuestion } from '../company/StockedReverseQuestion';
import { AssignedReverseQuestion, InsightRating } from '../interview/AssignedReverseQuestion';
import { InterviewReflection } from '../interview/InterviewReflection';
import { PreparationTodo } from '../todo/PreparationTodo';
import { TodoId } from '../todo/TodoId';
import { TaskType, TaskTypeCode } from '../todo/TaskType';
import { TaskStatus } from '../todo/TaskStatus';
import { TaskPriority } from '../todo/TaskPriority';
import {
  InterviewSessionScheduledEvent,
  InterviewSessionRescheduledEvent,
  ReverseQuestionAssignedEvent,
  ReverseQuestionAnswerRecordedEvent,
  InterviewReflectionRecordedEvent,
  PreparationTodoCreatedEvent,
  PreparationTodoStatusChangedEvent,
  SelectionStageAdvancedEvent,
  JobApplicationRejectedEvent,
  JobApplicationWithdrawnEvent,
  JobApplicationOfferAcceptedEvent,
  ProposedScheduleSubmittedEvent,
  ProposedScheduleConfirmedEvent,
  ProposedScheduleCancelledEvent,
  CasualInterviewDecisionMadeEvent,
  JobApplicationOpenedEvent,
} from '../events/CandidateDomainEvents';

export interface JobApplicationProps {
  id: ApplicationId;
  companyId: CompanyId;
  positionDetails: PositionDetails;
  motivation: PositionMotivation;
  currentStage: SelectionStage;
  status: ApplicationStatus;
  sessions: InterviewSession[];
  proposedSchedules?: ProposedSchedule[];
  todos: PreparationTodo[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class JobApplication extends AggregateRoot<ApplicationId> {
  private _companyId: CompanyId;
  private _positionDetails: PositionDetails;
  private _motivation: PositionMotivation;
  private _currentStage: SelectionStage;
  private _status: ApplicationStatus;
  private _sessions: InterviewSession[];
  private _proposedSchedules: ProposedSchedule[];
  private _todos: PreparationTodo[];
  private _version: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: JobApplicationProps) {
    super(props.id);
    this._companyId = props.companyId;
    this._positionDetails = props.positionDetails;
    this._motivation = props.motivation;
    this._currentStage = props.currentStage;
    this._status = props.status;
    this._sessions = props.sessions;
    this._proposedSchedules = props.proposedSchedules ?? [];
    this._todos = props.todos;
    this._version = props.version;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get companyId(): CompanyId {
    return this._companyId;
  }

  public get positionDetails(): PositionDetails {
    return this._positionDetails;
  }

  public get motivation(): PositionMotivation {
    return this._motivation;
  }

  public get currentStage(): SelectionStage {
    return this._currentStage;
  }

  public get status(): ApplicationStatus {
    return this._status;
  }

  public get sessions(): ReadonlyArray<InterviewSession> {
    return this._sessions;
  }

  public get proposedSchedules(): ReadonlyArray<ProposedSchedule> {
    return this._proposedSchedules;
  }

  public get todos(): ReadonlyArray<PreparationTodo> {
    return this._todos;
  }

  public get version(): number {
    return this._version;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(props: {
    id?: ApplicationId;
    companyId: CompanyId;
    positionDetails: PositionDetails;
    motivation?: PositionMotivation;
    initialStageCode?: StageCode;
  }): Result<JobApplication> {
    const id = props.id || ApplicationId.create().getValue();
    const stageResult = SelectionStage.create(props.initialStageCode || 'CASUAL_INTERVIEW');
    if (stageResult.isFailure()) {
      return Result.fail(stageResult.getError());
    }

    const motivation = props.motivation || PositionMotivation.create({}).getValue();
    const now = new Date();
    const application = new JobApplication({
      id,
      companyId: props.companyId,
      positionDetails: props.positionDetails,
      motivation,
      currentStage: stageResult.getValue(),
      status: ApplicationStatus.inProgress(),
      sessions: [],
      proposedSchedules: [],
      todos: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    application.addDomainEvent(
      new JobApplicationOpenedEvent(
        application.id.value,
        props.companyId.value,
        application.positionDetails.title,
        application.currentStage.code
      )
    );
    return Result.ok(application);
  }

  public static hydrate(props: JobApplicationProps): JobApplication {
    return new JobApplication(props);
  }

  public updatePositionDetails(newDetails: PositionDetails): void {
    this._positionDetails = newDetails;
    this._updatedAt = new Date();
  }

  public updateMotivation(newMotivation: PositionMotivation): void {
    this._motivation = newMotivation;
    this._updatedAt = new Date();
  }

  /**
   * Schedule a new interview session for this application and automatically
   * generate contextual preparation and follow-up tasks.
   */
  public scheduleInterview(props: {
    stage?: SelectionStage;
    timeWindow: TimeWindow;
    format: InterviewFormat;
    interviewerNames?: string[];
  }): Result<InterviewSession> {
    if (this._status.isTerminal) {
      return Result.fail(
        `既に選考終了（${this._status.label}）となった応募に面接日程を新規登録することはできません。`
      );
    }

    const targetStage = props.stage || this._currentStage;

    const sessionResult = InterviewSession.create({
      stage: targetStage,
      timeWindow: props.timeWindow,
      format: props.format,
      interviewerNames: props.interviewerNames,
    });

    if (sessionResult.isFailure()) {
      return Result.fail(sessionResult.getError());
    }

    const session = sessionResult.getValue();
    this._sessions.push(session);
    this._updatedAt = new Date();

    // Auto-generate candidate preparation & reflection tasks
    this.generateStagePreparationTodos(session);

    this.addDomainEvent(
      new InterviewSessionScheduledEvent(
        this.id.value,
        session.id.value,
        targetStage.code,
        props.timeWindow.formatJP(),
        props.format.getDisplaySummary()
      )
    );

    return Result.ok(session);
  }

  /**
   * Submit one or more candidate slots for a position's stage.
   * Cross-application booking checks stay in CandidateScheduleConflictDomainService.
   */
  public proposeSchedule(props: {
    stage?: SelectionStage;
    slots: TimeWindow[];
    format: InterviewFormat;
    note?: string;
  }): Result<ProposedSchedule> {
    if (this._status.isTerminal) {
      return Result.fail(
        `既に選考終了（${this._status.label}）となった応募に候補日を提示することはできません。`
      );
    }

    const targetStage = props.stage || this._currentStage;
    const pendingForStage = this._proposedSchedules.find(
      (proposal) => proposal.status.isPending && proposal.stage.code === targetStage.code
    );
    if (pendingForStage) {
      return Result.fail(
        `ステージ「${targetStage.label}」の日程調整がすでに返答待ちです。確定するか取り下げてから、新しい候補日を出してください。`
      );
    }

    const created = ProposedSchedule.create({
      stage: targetStage,
      slots: props.slots,
      format: props.format,
      note: props.note,
    });
    if (created.isFailure()) {
      return Result.fail(created.getError());
    }

    const proposal = created.getValue();
    this._proposedSchedules.push(proposal);
    this._updatedAt = new Date();
    this.addDomainEvent(
      new ProposedScheduleSubmittedEvent(
        this.id.value,
        proposal.id.value,
        targetStage.code,
        proposal.slots.length
      )
    );
    return Result.ok(proposal);
  }

  public confirmProposedSchedule(
    proposalId: ProposedScheduleId,
    slotIndex: number
  ): Result<InterviewSession> {
    const proposal = this._proposedSchedules.find((item) => item.id.equals(proposalId));
    if (!proposal) {
      return Result.fail(`ID: ${proposalId.value} の日程調整が見つかりません。`);
    }
    if (!proposal.status.isPending) {
      return Result.fail('返答待ちの日程調整だけ確定できます。');
    }
    const slot = proposal.slotAt(slotIndex);
    if (!slot) {
      return Result.fail('選択した候補日が見つかりません。');
    }

    const sessionResult = this.scheduleInterview({
      stage: proposal.stage,
      timeWindow: slot,
      format: proposal.format,
    });
    if (sessionResult.isFailure()) {
      return Result.fail(sessionResult.getError());
    }

    const confirmed = proposal.confirm(slotIndex);
    if (confirmed.isFailure()) {
      return Result.fail(confirmed.getError());
    }

    const session = sessionResult.getValue();
    this._updatedAt = new Date();
    this.addDomainEvent(
      new ProposedScheduleConfirmedEvent(
        this.id.value,
        proposal.id.value,
        session.id.value,
        slotIndex,
        slot.formatJP()
      )
    );
    return Result.ok(session);
  }

  public cancelProposedSchedule(proposalId: ProposedScheduleId): Result<void> {
    const proposal = this._proposedSchedules.find((item) => item.id.equals(proposalId));
    if (!proposal) {
      return Result.fail(`ID: ${proposalId.value} の日程調整が見つかりません。`);
    }

    const cancelled = proposal.cancel();
    if (cancelled.isFailure()) {
      return cancelled;
    }

    this._updatedAt = new Date();
    this.addDomainEvent(new ProposedScheduleCancelledEvent(this.id.value, proposal.id.value));
    return Result.ok(undefined);
  }

  /**
   * After a casual interview, the candidate decides whether to enter formal
   * selection. Company pass/fail is not the transition.
   */
  public decideAfterCasualInterview(
    decision: 'PROCEED' | 'WITHDRAW',
    reason?: string
  ): Result<{ nextStage: SelectionStage }> {
    if (this._status.isTerminal) {
      return Result.fail(`選考終了（${this._status.label}）のため、カジュアル面談後の判断はできません。`);
    }
    if (this._currentStage.code !== 'CASUAL_INTERVIEW') {
      return Result.fail('カジュアル面談中の応募だけが、正式選考へ進むか見送るかを選べます。');
    }

    if (decision === 'WITHDRAW') {
      const withdrawn = this.withdraw(reason || 'カジュアル面談の結果、選考を見送る');
      if (withdrawn.isFailure()) {
        return Result.fail(withdrawn.getError());
      }
      this.addDomainEvent(
        new CasualInterviewDecisionMadeEvent(this.id.value, 'WITHDRAW', this._currentStage.label)
      );
      return Result.ok({ nextStage: this._currentStage });
    }

    const casualSession = this._sessions.find((session) => session.stage.code === 'CASUAL_INTERVIEW');
    if (!casualSession) {
      return Result.fail('カジュアル面談の日程がまだ確定していません。');
    }
    if (!casualSession.reflection) {
      return Result.fail(
        'カジュアル面談の振り返りが未入力です。正式選考へ進む前に、面談の印象を記録してください。'
      );
    }

    const nextStage = this._currentStage.getNextStage();
    if (!nextStage) {
      return Result.fail(`現在のステージ「${this._currentStage.label}」は最終段階です。`);
    }

    const previousLabel = this._currentStage.label;
    this._currentStage = nextStage;
    this._updatedAt = new Date();
    this.addDomainEvent(new SelectionStageAdvancedEvent(this.id.value, previousLabel, nextStage.label));
    this.addDomainEvent(new CasualInterviewDecisionMadeEvent(this.id.value, 'PROCEED', nextStage.label));
    return Result.ok({ nextStage });
  }

  private generateStagePreparationTodos(session: InterviewSession): void {
    const stageLabel = session.stage.label;
    const defaultTaskDefs: { type: TaskTypeCode; priority: TaskPriority; title: string }[] = [
      {
        type: 'PRE_INTERVIEW_RESEARCH',
        priority: TaskPriority.high(),
        title: `【${stageLabel}】企業リサーチ・最新ニュース/技術ブログ確認`,
      },
      {
        type: 'REVERSE_QUESTION_PREP',
        priority: TaskPriority.high(),
        title: `【${stageLabel}】逆質問の選定と文脈カスタマイズ`,
      },
      {
        type: 'RESUME_PORTFOLIO_REVIEW',
        priority: TaskPriority.medium(),
        title: `【${stageLabel}】アピール実績・想定問答の事前整理`,
      },
      {
        type: 'ATTEND_INTERVIEW',
        priority: TaskPriority.urgent(),
        title: `【${stageLabel}】面接本番 (${session.timeWindow.formatJP()})`,
      },
      {
        type: 'POST_INTERVIEW_REFLECTION',
        priority: TaskPriority.urgent(),
        title: `【${stageLabel}】面接振り返り・逆質問回答メモの入力`,
      },
      {
        type: 'THANK_YOU_NOTE',
        priority: TaskPriority.medium(),
        title: `【${stageLabel}】面接お礼メール・追加資料の送付`,
      },
    ];

    for (const def of defaultTaskDefs) {
      const taskType = TaskType.create(def.type).getValue();
      const todoRes = PreparationTodo.create({
        applicationId: this.id,
        interviewSessionId: session.id,
        taskType,
        title: def.title,
        description: `フェーズ「${stageLabel}」における面接事前準備・事後タスク`,
        priority: def.priority,
        dueDate: session.timeWindow.start,
      });

      if (todoRes.isSuccess()) {
        const todo = todoRes.getValue();
        this._todos.push(todo);
        this.addDomainEvent(
          new PreparationTodoCreatedEvent(
            this.id.value,
            todo.id.value,
            todo.taskType.code,
            todo.title
          )
        );
      }
    }
  }

  public rescheduleInterview(
    sessionId: InterviewSessionId,
    newTimeWindow: TimeWindow
  ): Result<void> {
    const session = this._sessions.find((s) => s.id.equals(sessionId));
    if (!session) {
      return Result.fail(`ID: ${sessionId.value} の面接セッションが見つかりません。`);
    }

    const prevJP = session.timeWindow.formatJP();
    const res = session.reschedule(newTimeWindow);
    if (res.isFailure()) return res;

    // Update attend task title / due date
    const attendTodo = this._todos.find(
      (t) => t.interviewSessionId?.equals(sessionId) && t.taskType.code === 'ATTEND_INTERVIEW'
    );
    if (attendTodo) {
      // Due date update
    }

    this._updatedAt = new Date();
    this.addDomainEvent(
      new InterviewSessionRescheduledEvent(
        this.id.value,
        session.id.value,
        prevJP,
        newTimeWindow.formatJP()
      )
    );

    return Result.ok(undefined);
  }

  /**
   * Assign a stocked question from TargetCompany to this interview session
   * as a Value Object snapshot.
   */
  public assignStockedQuestion(
    sessionId: InterviewSessionId,
    stocked: StockedReverseQuestion,
    customizedText?: string
  ): Result<void> {
    const session = this._sessions.find((s) => s.id.equals(sessionId));
    if (!session) {
      return Result.fail(`ID: ${sessionId.value} の面接セッションが見つかりません。`);
    }

    const assignedVO = AssignedReverseQuestion.fromStocked(stocked, customizedText);
    const assignRes = session.assignQuestion(assignedVO);
    if (assignRes.isFailure()) return assignRes;

    this._updatedAt = new Date();
    this.addDomainEvent(
      new ReverseQuestionAssignedEvent(
        this.id.value,
        session.id.value,
        assignedVO.id,
        assignedVO.customizedQuestionText
      )
    );

    return Result.ok(undefined);
  }

  public recordQuestionAnswer(
    sessionId: InterviewSessionId,
    questionId: string,
    answer: string,
    rating?: InsightRating
  ): Result<void> {
    const session = this._sessions.find((s) => s.id.equals(sessionId));
    if (!session) {
      return Result.fail(`ID: ${sessionId.value} の面接セッションが見つかりません。`);
    }

    const res = session.recordQuestionAnswer(questionId, answer, rating);
    if (res.isFailure()) return res;

    this._updatedAt = new Date();
    this.addDomainEvent(
      new ReverseQuestionAnswerRecordedEvent(
        this.id.value,
        session.id.value,
        questionId,
        answer,
        rating
      )
    );

    return Result.ok(undefined);
  }

  public recordInterviewReflection(
    sessionId: InterviewSessionId,
    reflection: InterviewReflection
  ): Result<void> {
    const session = this._sessions.find((s) => s.id.equals(sessionId));
    if (!session) {
      return Result.fail(`ID: ${sessionId.value} の面接セッションが見つかりません。`);
    }

    const res = session.recordReflection(reflection);
    if (res.isFailure()) return res;

    // Automatically complete reflection & interview attendance todos
    const relatedTodos = this._todos.filter((t) => t.interviewSessionId?.equals(sessionId));
    for (const todo of relatedTodos) {
      if (
        (todo.taskType.code === 'POST_INTERVIEW_REFLECTION' ||
          todo.taskType.code === 'ATTEND_INTERVIEW') &&
        !todo.status.isDone
      ) {
        todo.markAsDone();
      }
    }

    this._updatedAt = new Date();
    this.addDomainEvent(
      new InterviewReflectionRecordedEvent(
        this.id.value,
        session.id.value,
        reflection.candidatePerformanceRating,
        reflection.companyImpressionRating,
        reflection.keyLearningsAndInsights
      )
    );

    return Result.ok(undefined);
  }

  public addCustomTodo(props: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: Date;
    sessionId?: InterviewSessionId;
  }): Result<PreparationTodo> {
    if (this._status.isTerminal) {
      return Result.fail('終了済みの選考にタスクを追加することはできません。');
    }

    const taskType = TaskType.create('CUSTOM_TODO').getValue();
    const todoResult = PreparationTodo.create({
      applicationId: this.id,
      interviewSessionId: props.sessionId,
      taskType,
      title: props.title,
      description: props.description || '',
      priority: props.priority || TaskPriority.medium(),
      dueDate: props.dueDate,
    });

    if (todoResult.isFailure()) return Result.fail(todoResult.getError());

    const todo = todoResult.getValue();
    this._todos.push(todo);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new PreparationTodoCreatedEvent(
        this.id.value,
        todo.id.value,
        todo.taskType.code,
        todo.title
      )
    );

    return Result.ok(todo);
  }

  public updateTodoStatus(todoId: TodoId, newStatus: TaskStatus): Result<void> {
    const todo = this._todos.find((t) => t.id.equals(todoId));
    if (!todo) {
      return Result.fail(`ID: ${todoId.value} のタスクが見つかりません。`);
    }

    const prevLabel = todo.status.label;
    const res = todo.updateStatus(newStatus);
    if (res.isFailure()) return res;

    this._updatedAt = new Date();
    this.addDomainEvent(
      new PreparationTodoStatusChangedEvent(
        this.id.value,
        todo.id.value,
        todo.title,
        prevLabel,
        newStatus.label
      )
    );

    return Result.ok(undefined);
  }

  /**
   * Advance pipeline to the next stage, checking domain invariants.
   */
  public advanceStage(): Result<{ nextStage: SelectionStage }> {
    if (this._status.isTerminal) {
      return Result.fail(`選考終了（${this._status.label}）のため次のステージに進むことはできません。`);
    }

    if (this._currentStage.code === 'CASUAL_INTERVIEW') {
      return Result.fail('カジュアル面談のあとは、正式選考へ進むか見送るかを選んでください。');
    }

    const nextStage = this._currentStage.getNextStage();
    if (!nextStage) {
      return Result.fail(`現在のステージ「${this._currentStage.label}」は最終段階です。`);
    }

    // Check blocking tasks for the current stage
    const currentSession = this._sessions.find((s) => s.stage.code === this._currentStage.code);
    if (currentSession) {
      if (!currentSession.reflection) {
        return Result.fail(
          `ステージ「${this._currentStage.label}」の面接振り返り（Reflection）が未入力です。次のステージに進む前に振り返りを記録してください。`
        );
      }
    }

    const prevLabel = this._currentStage.label;
    this._currentStage = nextStage;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new SelectionStageAdvancedEvent(this.id.value, prevLabel, nextStage.label)
    );

    return Result.ok({ nextStage });
  }

  public acceptOffer(): Result<void> {
    if (this._status.isTerminal) {
      return Result.fail('既に完了している選考です。');
    }

    this._status = ApplicationStatus.offerAccepted();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new JobApplicationOfferAcceptedEvent(this.id.value, this._positionDetails.title)
    );

    return Result.ok(undefined);
  }

  public reject(reason?: string): Result<void> {
    if (this._status.isTerminal) {
      return Result.fail('既に完了している選考です。');
    }

    const currentStageLabel = this._currentStage.label;
    this._status = ApplicationStatus.rejected();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new JobApplicationRejectedEvent(
        this.id.value,
        currentStageLabel,
        reason || '企業側よりお見送りの連絡'
      )
    );

    return Result.ok(undefined);
  }

  public withdraw(reason?: string): Result<void> {
    if (this._status.isTerminal) {
      return Result.fail('既に完了している選考です。');
    }

    const currentStageLabel = this._currentStage.label;
    this._status = ApplicationStatus.withdrawn();
    this._updatedAt = new Date();

    this.addDomainEvent(
      new JobApplicationWithdrawnEvent(
        this.id.value,
        currentStageLabel,
        reason || '候補者側からの選考辞退'
      )
    );

    return Result.ok(undefined);
  }
}
