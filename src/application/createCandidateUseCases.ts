import type { IEventBus } from '@/application/events/IEventBus';
import { AddCustomTodoUseCase } from '@/application/use-cases/AddCustomTodoUseCase';
import { AddStockedReverseQuestionUseCase } from '@/application/use-cases/AddStockedReverseQuestionUseCase';
import { AdvanceSelectionStageUseCase } from '@/application/use-cases/AdvanceSelectionStageUseCase';
import { AssignReverseQuestionUseCase } from '@/application/use-cases/AssignReverseQuestionUseCase';
import { CreateJobApplicationUseCase } from '@/application/use-cases/CreateJobApplicationUseCase';
import { CreateTargetCompanyUseCase } from '@/application/use-cases/CreateTargetCompanyUseCase';
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
  addStockedReverseQuestion: AddStockedReverseQuestionUseCase;
  createJobApplication: CreateJobApplicationUseCase;
  scheduleInterview: ScheduleInterviewUseCase;
  rescheduleInterview: RescheduleInterviewUseCase;
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
  applicationRepo: IJobApplicationRepository,
  eventBus: IEventBus
): CandidateUseCases {
  return {
    createTargetCompany: new CreateTargetCompanyUseCase(companyRepo, eventBus),
    addStockedReverseQuestion: new AddStockedReverseQuestionUseCase(companyRepo, eventBus),
    createJobApplication: new CreateJobApplicationUseCase(applicationRepo, companyRepo, eventBus),
    scheduleInterview: new ScheduleInterviewUseCase(applicationRepo, eventBus),
    rescheduleInterview: new RescheduleInterviewUseCase(applicationRepo, eventBus),
    assignReverseQuestion: new AssignReverseQuestionUseCase(applicationRepo, companyRepo, eventBus),
    recordQuestionAnswer: new RecordQuestionAnswerUseCase(applicationRepo, eventBus),
    recordInterviewReflection: new RecordInterviewReflectionUseCase(applicationRepo, eventBus),
    toggleTodoStatus: new ToggleTodoStatusUseCase(applicationRepo, eventBus),
    advanceSelectionStage: new AdvanceSelectionStageUseCase(applicationRepo, eventBus),
    rejectOrWithdrawApplication: new RejectOrWithdrawApplicationUseCase(applicationRepo, eventBus),
    addCustomTodo: new AddCustomTodoUseCase(applicationRepo, eventBus),
  };
}
