import { TargetAudience } from '@/domain/company/BusinessModel';
import { CloudPlatformType } from '@/domain/company/TechStackProfile';
import { QuestionCategory, TargetInterviewerRole } from '@/domain/company/StockedReverseQuestion';
import { StageCode } from '@/domain/application/SelectionStage';
import { ApplicationStatusCode } from '@/domain/application/ApplicationStatus';
import { FormatType } from '@/domain/interview/InterviewFormat';
import { ProposedScheduleStatusCode } from '@/domain/interview/ProposedScheduleStatus';
import { InsightRating } from '@/domain/interview/AssignedReverseQuestion';
import { PerformanceRating } from '@/domain/interview/InterviewReflection';
import { TaskTypeCode } from '@/domain/todo/TaskType';
import { TaskStatusCode } from '@/domain/todo/TaskStatus';
import { PriorityLevel } from '@/domain/todo/TaskPriority';
import { DesirabilityRating } from '@/domain/application/PositionDetails';

export interface StockedReverseQuestionDTO {
  id: string;
  category: QuestionCategory;
  categoryLabel: string;
  targetRole: TargetInterviewerRole;
  targetRoleLabel: string;
  questionText: string;
  hypothesisOrIntent: string;
}

export interface TargetCompanyDTO {
  id: string;
  name: string;
  businessModel: {
    productSummary: string;
    targetAudience: TargetAudience;
    revenueStream: string;
    keyCompetitors: string[];
  };
  techStack: {
    primaryLanguages: string[];
    cloudPlatform: CloudPlatformType;
    architectureHighlights: string[];
    techBlogUrls: string[];
  };
  overallAttractivenessSummary?: string;
  corporateMission?: string;
  stockedQuestions: StockedReverseQuestionDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface AssignedReverseQuestionDTO {
  id: string;
  sourceQuestionId?: string;
  category: QuestionCategory;
  customizedQuestionText: string;
  isAsked: boolean;
  obtainedAnswer?: string;
  insightRating?: InsightRating;
}

export interface InterviewReflectionDTO {
  candidatePerformanceRating: PerformanceRating;
  companyImpressionRating: PerformanceRating;
  keyLearningsAndInsights: string;
  concernsOrRedFlags?: string;
  nextActionNotes: string;
  recordedAt: string;
}

export interface InterviewSessionDTO {
  id: string;
  stageCode: StageCode;
  stageLabel: string;
  startTime: string;
  endTime: string;
  timeWindowJP: string;
  durationMinutes: number;
  formatType: FormatType;
  formatSummary: string;
  meetingUrl?: string;
  locationName?: string;
  roomName?: string;
  travelBufferMinutes: number;
  interviewerNames: string[];
  assignedQuestions: AssignedReverseQuestionDTO[];
  reflection?: InterviewReflectionDTO;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposedScheduleSlotDTO {
  slotIndex: number;
  startTime: string;
  endTime: string;
  timeWindowJP: string;
}

export interface ProposedScheduleDTO {
  id: string;
  stageCode: StageCode;
  stageLabel: string;
  statusCode: ProposedScheduleStatusCode;
  statusLabel: string;
  formatType: FormatType;
  formatSummary: string;
  note: string;
  slots: ProposedScheduleSlotDTO[];
  confirmedSlotIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PreparationTodoDTO {
  id: string;
  applicationId: string;
  interviewSessionId?: string;
  taskTypeCode: TaskTypeCode;
  title: string;
  description: string;
  statusCode: TaskStatusCode;
  statusLabel: string;
  priorityLevel: PriorityLevel;
  priorityLabel: string;
  priorityColor: string;
  isBlocking: boolean;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface JobApplicationDTO {
  id: string;
  companyId: string;
  companyName: string;
  positionTitle: string;
  jobDescriptionUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryFormatted: string;
  targetSeniority?: string;
  desirabilityRating: DesirabilityRating;
  whyThisRole: string;
  valueProposition: string;
  careerGrowthAlignment: string;
  currentStageCode: StageCode;
  currentStageLabel: string;
  statusCode: ApplicationStatusCode;
  statusLabel: string;
  isTerminal: boolean;
  sessions: InterviewSessionDTO[];
  proposedSchedules: ProposedScheduleDTO[];
  todos: PreparationTodoDTO[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DomainEventDTO {
  eventId: string;
  aggregateId: string;
  eventType: string;
  occurredOn: string;
  payload: Record<string, unknown>;
}
