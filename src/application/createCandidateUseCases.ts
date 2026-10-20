import { AddCustomTodoUseCase } from '@/application/use-cases/AddCustomTodoUseCase';
import { AddStockedReverseQuestionUseCase } from '@/application/use-cases/AddStockedReverseQuestionUseCase';
import { AdvanceSelectionStageUseCase } from '@/application/use-cases/AdvanceSelectionStageUseCase';
import { AssignReverseQuestionUseCase } from '@/application/use-cases/AssignReverseQuestionUseCase';
import { CancelProposedScheduleUseCase } from '@/application/use-cases/CancelProposedScheduleUseCase';
import { ConfirmProposedScheduleUseCase } from '@/application/use-cases/ConfirmProposedScheduleUseCase';
import { CreateJobApplicationUseCase } from '@/application/use-cases/CreateJobApplicationUseCase';
import { DecideAfterCasualInterviewUseCase } from '@/application/use-cases/DecideAfterCasualInterviewUseCase';
import { ProposeScheduleUseCase } from '@/application/use-cases/ProposeScheduleUseCase';
import { CreateTargetCompanyUseCase } from '@/application/use-cases/CreateTargetCompanyUseCase';
import { ReviseInterviewUseCase } from '@/application/use-cases/ReviseInterviewUseCase';
import { ReviseTargetCompanyUseCase } from '@/application/use-cases/ReviseTargetCompanyUseCase';
import { RecordInterviewReflectionUseCase } from '@/application/use-cases/RecordInterviewReflectionUseCase';
import { RecordQuestionAnswerUseCase } from '@/application/use-cases/RecordQuestionAnswerUseCase';
import { RejectOrWithdrawApplicationUseCase } from '@/application/use-cases/RejectOrWithdrawApplicationUseCase';
import { RescheduleInterviewUseCase } from '@/application/use-cases/RescheduleInterviewUseCase';
import { ScheduleInterviewUseCase } from '@/application/use-cases/ScheduleInterviewUseCase';
import { ToggleTodoStatusUseCase } from '@/application/use-cases/ToggleTodoStatusUseCase';
import type { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import type { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';

export interface CandidateUseCases {
  createTargetCompany: CreateTargetCompanyUseCase;
  reviseTargetCompany: ReviseTargetCompanyUseCase;
  addStockedReverseQuestion: AddStockedReverseQuestionUseCase;
  createJobApplication: CreateJobApplicationUseCase;
  scheduleInterview: ScheduleInterviewUseCase;
  proposeSchedule: ProposeScheduleUseCase;
  confirmProposedSchedule: ConfirmProposedScheduleUseCase;
  cancelProposedSchedule: CancelProposedScheduleUseCase;
  decideAfterCasualInterview: DecideAfterCasualInterviewUseCase;
  rescheduleInterview: RescheduleInterviewUseCase;
  reviseInterview: ReviseInterviewUseCase;
  assignReverseQuestion: AssignReverseQuestionUseCase;
  recordQuestionAnswer: RecordQuestionAnswerUseCase;
  recordInterviewReflection: RecordInterviewReflectionUseCase;
  toggleTodoStatus: ToggleTodoStatusUseCase;
  advanceSelectionStage: AdvanceSelectionStageUseCase;
  rejectOrWithdrawApplication: RejectOrWithdrawApplicationUseCase;
  addCustomTodo: AddCustomTodoUseCase;
}

export function createCandidateUseCases(
  companyRepo: ITargetCompanyRepository,
  applicationRepo: IJobApplicationRepository
): CandidateUseCases {
  return {
    createTargetCompany: new CreateTargetCompanyUseCase(companyRepo),
    reviseTargetCompany: new ReviseTargetCompanyUseCase(companyRepo),
    addStockedReverseQuestion: new AddStockedReverseQuestionUseCase(companyRepo),
    createJobApplication: new CreateJobApplicationUseCase(applicationRepo, companyRepo),
    scheduleInterview: new ScheduleInterviewUseCase(applicationRepo),
    proposeSchedule: new ProposeScheduleUseCase(applicationRepo),
    confirmProposedSchedule: new ConfirmProposedScheduleUseCase(applicationRepo),
    cancelProposedSchedule: new CancelProposedScheduleUseCase(applicationRepo),
    decideAfterCasualInterview: new DecideAfterCasualInterviewUseCase(applicationRepo),
    rescheduleInterview: new RescheduleInterviewUseCase(applicationRepo),
    reviseInterview: new ReviseInterviewUseCase(applicationRepo),
    assignReverseQuestion: new AssignReverseQuestionUseCase(applicationRepo, companyRepo),
    recordQuestionAnswer: new RecordQuestionAnswerUseCase(applicationRepo),
    recordInterviewReflection: new RecordInterviewReflectionUseCase(applicationRepo),
    toggleTodoStatus: new ToggleTodoStatusUseCase(applicationRepo),
    advanceSelectionStage: new AdvanceSelectionStageUseCase(applicationRepo),
    rejectOrWithdrawApplication: new RejectOrWithdrawApplicationUseCase(applicationRepo),
    addCustomTodo: new AddCustomTodoUseCase(applicationRepo),
  };
}
