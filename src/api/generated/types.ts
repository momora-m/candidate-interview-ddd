import type { components, paths } from './schema';

export type { components, paths };

// Schemas
export type Schemas = components['schemas'];

export type HealthStatus = Schemas['HealthStatus'];
export type TargetAudience = Schemas['TargetAudience'];
export type CloudPlatform = Schemas['CloudPlatform'];
export type QuestionCategory = Schemas['QuestionCategory'];
export type TargetInterviewerRole = Schemas['TargetInterviewerRole'];
export type StageCode = Schemas['StageCode'];
export type ApplicationStatusCode = Schemas['ApplicationStatusCode'];
export type FormatType = Schemas['FormatType'];
export type TaskTypeCode = Schemas['TaskTypeCode'];
export type TaskStatusCode = Schemas['TaskStatusCode'];
export type PriorityLevel = Schemas['PriorityLevel'];
export type Rating1To5 = Schemas['Rating1To5'];

export type BusinessModel = Schemas['BusinessModel'];
export type TechStackProfile = Schemas['TechStackProfile'];
export type StockedReverseQuestion = Schemas['StockedReverseQuestion'];
export type TargetCompany = Schemas['TargetCompany'];
export type AssignedReverseQuestion = Schemas['AssignedReverseQuestion'];
export type InterviewReflection = Schemas['InterviewReflection'];
export type InterviewSession = Schemas['InterviewSession'];
export type PreparationTodo = Schemas['PreparationTodo'];
export type JobApplication = Schemas['JobApplication'];
export type ProposedSchedule = Schemas['ProposedSchedule'];
export type ProposeScheduleRequest = Schemas['ProposeScheduleRequest'];
export type ConfirmProposedScheduleRequest = Schemas['ConfirmProposedScheduleRequest'];
export type CasualDecisionRequest = Schemas['CasualDecisionRequest'];
export type DomainEvent = Schemas['DomainEvent'];

// Request Bodies
export type CreateCompanyRequest = Schemas['CreateCompanyRequest'];
export type AddStockedQuestionRequest = Schemas['AddStockedQuestionRequest'];
export type CreateApplicationRequest = Schemas['CreateApplicationRequest'];
export type ScheduleInterviewRequest = Schemas['ScheduleInterviewRequest'];
export type ReviseInterviewRequest = Schemas['ReviseInterviewRequest'];
export type RescheduleInterviewRequest = Schemas['RescheduleInterviewRequest'];
export type AssignQuestionRequest = Schemas['AssignQuestionRequest'];
export type RecordAnswerRequest = Schemas['RecordAnswerRequest'];
export type RecordReflectionRequest = Schemas['RecordReflectionRequest'];
export type AddTodoRequest = Schemas['AddTodoRequest'];
export type UpdateTodoStatusRequest = Schemas['UpdateTodoStatusRequest'];
export type CloseApplicationRequest = Schemas['CloseApplicationRequest'];

// Responses
export type AdvanceStageResponse = Schemas['AdvanceStageResponse'];
export type ErrorResponse = Schemas['ErrorResponse'];
export type ValidationErrorResponse = Schemas['ValidationErrorResponse'];
