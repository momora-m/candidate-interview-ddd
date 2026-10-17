import { ApplicationId } from '@/domain/application/ApplicationId';
import { ApplicationStatus, type ApplicationStatusCode } from '@/domain/application/ApplicationStatus';
import { PositionDetails, type DesirabilityRating } from '@/domain/application/PositionDetails';
import { PositionMotivation } from '@/domain/application/PositionMotivation';
import { SalaryRange } from '@/domain/application/SalaryRange';
import { SelectionStage, type StageCode } from '@/domain/application/SelectionStage';
import { JobApplication } from '@/domain/application/JobApplication';
import { CompanyId } from '@/domain/company/CompanyId';
import type { QuestionCategory } from '@/domain/company/StockedReverseQuestion';
import {
  AssignedReverseQuestion,
  type InsightRating,
} from '@/domain/interview/AssignedReverseQuestion';
import { InterviewFormat } from '@/domain/interview/InterviewFormat';
import { InterviewReflection, type PerformanceRating } from '@/domain/interview/InterviewReflection';
import { InterviewSession } from '@/domain/interview/InterviewSession';
import { InterviewSessionId } from '@/domain/interview/InterviewSessionId';
import { MeetingUrl } from '@/domain/interview/MeetingUrl';
import { TimeWindow } from '@/domain/interview/TimeWindow';
import { PreparationTodo } from '@/domain/todo/PreparationTodo';
import { TaskPriority, type PriorityLevel } from '@/domain/todo/TaskPriority';
import { TaskStatus, type TaskStatusCode } from '@/domain/todo/TaskStatus';
import { TaskType, type TaskTypeCode } from '@/domain/todo/TaskType';
import { TodoId } from '@/domain/todo/TodoId';
import { PersistenceError } from '../PersistenceError';
import {
  asBoolean,
  asDate,
  asNumber,
  asOptionalDate,
  asOptionalNumber,
  asOptionalString,
  asStringArray,
  unwrap,
} from '../sql';

export interface JobApplicationRow {
  id: string;
  company_id: string;
  position_title: string;
  job_description_url: string | null;
  salary_min_amount: number | string | null;
  salary_max_amount: number | string | null;
  salary_currency: string;
  target_seniority: string | null;
  desirability_rating: number | string;
  why_this_role: string;
  value_proposition: string;
  career_growth_alignment: string;
  current_stage: string;
  status: string;
  version: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface InterviewSessionRow {
  id: string;
  application_id: string;
  stage_code: string;
  starts_at: Date | string;
  ends_at: Date | string;
  format_type: string;
  meeting_url: string | null;
  meeting_platform: string | null;
  meeting_passcode: string | null;
  meeting_notes: string | null;
  location_name: string | null;
  room_name: string | null;
  reception_instructions: string | null;
  estimated_travel_minutes: number | string | null;
  interviewer_names: unknown;
  is_completed: unknown;
  reflection_candidate_performance_rating: number | string | null;
  reflection_company_impression_rating: number | string | null;
  reflection_key_learnings: string | null;
  reflection_concerns: string | null;
  reflection_next_actions: string | null;
  reflection_recorded_at: Date | string | null;
  sort_order: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AssignedQuestionRow {
  id: string;
  session_id: string;
  source_question_id: string | null;
  category: string;
  customized_question_text: string;
  is_asked: unknown;
  obtained_answer: string | null;
  insight_rating: number | string | null;
  sort_order: number | string;
}

export interface PreparationTodoRow {
  id: string;
  application_id: string;
  interview_session_id: string | null;
  task_type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: Date | string | null;
  created_at: Date | string;
  completed_at: Date | string | null;
  sort_order: number | string;
}

export function jobApplicationToParams(application: JobApplication): unknown[] {
  const position = application.positionDetails;
  const salary = position.expectedSalaryRange;
  const motivation = application.motivation;
  return [
    application.id.value,
    application.companyId.value,
    position.title,
    position.jobDescriptionUrl ?? null,
    salary.minAmount ?? null,
    salary.maxAmount ?? null,
    salary.currency,
    position.targetSeniority ?? null,
    position.desirabilityRating,
    motivation.whyThisRole,
    motivation.valueProposition,
    motivation.careerGrowthAlignment,
    application.currentStage.code,
    application.status.code,
    application.version,
    application.createdAt,
    application.updatedAt,
  ];
}

export function interviewSessionToRow(
  applicationId: string,
  session: InterviewSession,
  sortOrder: number
): unknown[] {
  const online = session.format.onlineDetails;
  const inPerson = session.format.inPersonDetails;
  const reflection = session.reflection;
  return [
    session.id.value,
    applicationId,
    session.stage.code,
    session.timeWindow.start,
    session.timeWindow.end,
    session.format.type,
    online?.meetingUrl.url ?? null,
    online?.meetingUrl.platform ?? null,
    online?.meetingPasscode ?? null,
    online?.notes ?? null,
    inPerson?.locationName ?? null,
    inPerson?.roomName ?? null,
    inPerson?.receptionInstructions ?? null,
    inPerson?.estimatedTravelMinutes ?? null,
    [...session.interviewerNames],
    session.isCompleted,
    reflection?.candidatePerformanceRating ?? null,
    reflection?.companyImpressionRating ?? null,
    reflection?.keyLearningsAndInsights ?? null,
    reflection?.concernsOrRedFlags ?? null,
    reflection?.nextActionNotes ?? null,
    reflection?.recordedAt ?? null,
    sortOrder,
    session.createdAt,
    session.updatedAt,
  ];
}

export function assignedQuestionToRow(
  sessionId: string,
  question: AssignedReverseQuestion,
  sortOrder: number
): unknown[] {
  return [
    question.id,
    sessionId,
    question.sourceQuestionId ?? null,
    question.category,
    question.customizedQuestionText,
    question.isAsked,
    question.obtainedAnswer ?? null,
    question.insightRating ?? null,
    sortOrder,
  ];
}

export function preparationTodoToRow(todo: PreparationTodo, sortOrder: number): unknown[] {
  return [
    todo.id.value,
    todo.applicationId.value,
    todo.interviewSessionId?.value ?? null,
    todo.taskType.code,
    todo.title,
    todo.description,
    todo.status.code,
    todo.priority.level,
    todo.dueDate ?? null,
    todo.createdAt,
    todo.completedAt ?? null,
    sortOrder,
  ];
}

export function toJobApplication(
  row: JobApplicationRow,
  sessions: readonly InterviewSessionRow[],
  questions: readonly AssignedQuestionRow[],
  todos: readonly PreparationTodoRow[]
): JobApplication {
  const context = `JobApplication(${row.id})`;
  const questionsBySession = new Map<string, AssignedQuestionRow[]>();
  for (const question of questions) {
    const bucket = questionsBySession.get(question.session_id);
    if (bucket) {
      bucket.push(question);
    } else {
      questionsBySession.set(question.session_id, [question]);
    }
  }

  const salary = unwrap(
    SalaryRange.create({
      minAmount: asOptionalNumber(row.salary_min_amount),
      maxAmount: asOptionalNumber(row.salary_max_amount),
      currency: row.salary_currency,
    }),
    `${context} の SalaryRange`
  );
  const positionDetails = unwrap(
    PositionDetails.create({
      title: row.position_title,
      jobDescriptionUrl: asOptionalString(row.job_description_url),
      expectedSalaryRange: salary,
      targetSeniority: asOptionalString(row.target_seniority),
      desirabilityRating: asNumber(row.desirability_rating, `${context}.desirability`) as DesirabilityRating,
    }),
    `${context} の PositionDetails`
  );
  const motivation = unwrap(
    PositionMotivation.create({
      whyThisRole: row.why_this_role,
      valueProposition: row.value_proposition,
      careerGrowthAlignment: row.career_growth_alignment,
    }),
    `${context} の PositionMotivation`
  );

  return JobApplication.hydrate({
    id: unwrap(ApplicationId.create(row.id), `${context} の ApplicationId`),
    companyId: unwrap(CompanyId.create(row.company_id), `${context} の CompanyId`),
    positionDetails,
    motivation,
    currentStage: unwrap(
      SelectionStage.create(row.current_stage as StageCode),
      `${context} の SelectionStage`
    ),
    status: unwrap(
      ApplicationStatus.create(row.status as ApplicationStatusCode),
      `${context} の ApplicationStatus`
    ),
    sessions: sessions.map((session) =>
      toInterviewSession(session, questionsBySession.get(session.id) ?? [])
    ),
    todos: todos.map((todo) => toPreparationTodo(todo)),
    version: asNumber(row.version, `${context}.version`),
    createdAt: asDate(row.created_at, `${context}.createdAt`),
    updatedAt: asDate(row.updated_at, `${context}.updatedAt`),
  });
}

function toInterviewSession(
  row: InterviewSessionRow,
  questions: readonly AssignedQuestionRow[]
): InterviewSession {
  const context = `InterviewSession(${row.id})`;
  const reflection = toReflection(row, context);
  return InterviewSession.hydrate({
    id: unwrap(InterviewSessionId.create(row.id), `${context} の InterviewSessionId`),
    stage: unwrap(SelectionStage.create(row.stage_code as StageCode), `${context} の SelectionStage`),
    timeWindow: unwrap(
      TimeWindow.create(asDate(row.starts_at, `${context}.startsAt`), asDate(row.ends_at, `${context}.endsAt`)),
      `${context} の TimeWindow`
    ),
    format: toInterviewFormat(row, context),
    interviewerNames: asStringArray(row.interviewer_names, `${context}.interviewerNames`),
    assignedQuestions: questions.map((question) => toAssignedQuestion(question, context)),
    reflection,
    isCompleted: asBoolean(row.is_completed, `${context}.isCompleted`),
    createdAt: asDate(row.created_at, `${context}.createdAt`),
    updatedAt: asDate(row.updated_at, `${context}.updatedAt`),
  });
}

function toInterviewFormat(row: InterviewSessionRow, context: string): InterviewFormat {
  if (row.format_type === 'ONLINE') {
    if (!row.meeting_url) {
      throw new PersistenceError(`${context}: オンライン面接の meeting_url が空です。`);
    }
    const meetingUrl = unwrap(MeetingUrl.create(row.meeting_url), `${context} の MeetingUrl`);
    return unwrap(
      InterviewFormat.createOnline(
        meetingUrl,
        asOptionalString(row.meeting_passcode),
        asOptionalString(row.meeting_notes)
      ),
      `${context} の InterviewFormat`
    );
  }

  if (row.format_type === 'IN_PERSON') {
    return unwrap(
      InterviewFormat.createInPerson(
        row.location_name ?? '',
        row.room_name ?? '',
        row.reception_instructions ?? undefined,
        asOptionalNumber(row.estimated_travel_minutes)
      ),
      `${context} の InterviewFormat`
    );
  }

  throw new PersistenceError(`${context}: 未知の開催形式です (${row.format_type})`);
}

function toReflection(row: InterviewSessionRow, context: string): InterviewReflection | undefined {
  if (
    row.reflection_candidate_performance_rating === null ||
    row.reflection_candidate_performance_rating === undefined ||
    row.reflection_recorded_at === null ||
    row.reflection_recorded_at === undefined
  ) {
    return undefined;
  }

  return unwrap(
    InterviewReflection.create({
      candidatePerformanceRating: asNumber(
        row.reflection_candidate_performance_rating,
        `${context}.candidatePerformance`
      ) as PerformanceRating,
      companyImpressionRating: asNumber(
        row.reflection_company_impression_rating ?? '',
        `${context}.companyImpression`
      ) as PerformanceRating,
      keyLearningsAndInsights: row.reflection_key_learnings ?? '',
      concernsOrRedFlags: asOptionalString(row.reflection_concerns),
      nextActionNotes: row.reflection_next_actions ?? '',
      recordedAt: asDate(row.reflection_recorded_at, `${context}.reflectionRecordedAt`),
    }),
    `${context} の InterviewReflection`
  );
}

function toAssignedQuestion(row: AssignedQuestionRow, context: string): AssignedReverseQuestion {
  const rating = asOptionalNumber(row.insight_rating);
  return unwrap(
    AssignedReverseQuestion.create({
      id: row.id,
      sourceQuestionId: asOptionalString(row.source_question_id),
      category: row.category as QuestionCategory,
      customizedQuestionText: row.customized_question_text,
      isAsked: asBoolean(row.is_asked, `${context} question(${row.id}).isAsked`),
      obtainedAnswer: asOptionalString(row.obtained_answer),
      insightRating: rating as InsightRating | undefined,
    }),
    `${context} の AssignedReverseQuestion(${row.id})`
  );
}

function toPreparationTodo(row: PreparationTodoRow): PreparationTodo {
  const context = `PreparationTodo(${row.id})`;
  const applicationId = unwrap(ApplicationId.create(row.application_id), `${context} の ApplicationId`);
  return PreparationTodo.hydrate({
    id: unwrap(TodoId.create(row.id), `${context} の TodoId`),
    applicationId,
    interviewSessionId: row.interview_session_id
      ? unwrap(
          InterviewSessionId.create(row.interview_session_id),
          `${context} の InterviewSessionId`
        )
      : undefined,
    taskType: unwrap(TaskType.create(row.task_type as TaskTypeCode), `${context} の TaskType`),
    title: row.title,
    description: row.description,
    status: unwrap(TaskStatus.create(row.status as TaskStatusCode), `${context} の TaskStatus`),
    priority: unwrap(TaskPriority.create(row.priority as PriorityLevel), `${context} の TaskPriority`),
    dueDate: asOptionalDate(row.due_date, `${context}.dueDate`),
    createdAt: asDate(row.created_at, `${context}.createdAt`),
    completedAt: asOptionalDate(row.completed_at, `${context}.completedAt`),
  });
}
