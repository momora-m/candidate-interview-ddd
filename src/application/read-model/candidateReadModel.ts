import type { JobApplication } from '@/domain/application/JobApplication';
import type { TargetCompany } from '@/domain/company/TargetCompany';
import type { IDomainEvent } from '@/domain/shared/DomainEvent';
import type {
  DomainEventDTO,
  InterviewSessionDTO,
  JobApplicationDTO,
  PreparationTodoDTO,
  ProposedScheduleDTO,
  TargetCompanyDTO,
} from '@/application/dtos/CandidateApplicationDTOs';

export function toCompanyDTO(company: TargetCompany): TargetCompanyDTO {
  return {
    id: company.id.value,
    name: company.name,
    businessModel: {
      productSummary: company.profile.businessModel.productSummary,
      targetAudience: company.profile.businessModel.targetAudience,
      revenueStream: company.profile.businessModel.revenueStream,
      keyCompetitors: [...company.profile.businessModel.keyCompetitors],
    },
    techStack: {
      primaryLanguages: [...company.profile.techStack.primaryLanguages],
      cloudPlatform: company.profile.techStack.cloudPlatform,
      architectureHighlights: [...company.profile.techStack.architectureHighlights],
      techBlogUrls: [...company.profile.techStack.techBlogUrls],
    },
    overallAttractivenessSummary: company.profile.overallAttractivenessSummary,
    corporateMission: company.profile.corporateMission,
    stockedQuestions: company.stockedQuestions.map((question) => ({
      id: question.id,
      category: question.category,
      categoryLabel: question.categoryLabel,
      targetRole: question.targetRole,
      targetRoleLabel: question.targetRoleLabel,
      questionText: question.questionText,
      hypothesisOrIntent: question.hypothesisOrIntent,
    })),
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

export function toApplicationDTO(
  application: JobApplication,
  companyName = 'Unknown Company'
): JobApplicationDTO {
  const sessions: InterviewSessionDTO[] = application.sessions.map((session) => ({
    id: session.id.value,
    stageCode: session.stage.code,
    stageLabel: session.stage.label,
    startTime: session.timeWindow.start.toISOString(),
    endTime: session.timeWindow.end.toISOString(),
    timeWindowJP: session.timeWindow.formatJP(),
    durationMinutes: session.timeWindow.durationMinutes,
    formatType: session.format.type,
    formatSummary: session.format.getDisplaySummary(),
    meetingUrl: session.format.onlineDetails?.meetingUrl.url,
    meetingPasscode: session.format.onlineDetails?.meetingPasscode,
    locationName: session.format.inPersonDetails?.locationName,
    roomName: session.format.inPersonDetails?.roomName,
    receptionInstructions: session.format.inPersonDetails?.receptionInstructions,
    travelBufferMinutes: session.format.travelBufferMinutes,
    interviewerNames: [...session.interviewerNames],
    assignedQuestions: session.assignedQuestions.map((question) => ({
      id: question.id,
      sourceQuestionId: question.sourceQuestionId,
      category: question.category,
      customizedQuestionText: question.customizedQuestionText,
      isAsked: question.isAsked,
      obtainedAnswer: question.obtainedAnswer,
      insightRating: question.insightRating,
    })),
    reflection: session.reflection
      ? {
          candidatePerformanceRating: session.reflection.candidatePerformanceRating,
          companyImpressionRating: session.reflection.companyImpressionRating,
          keyLearningsAndInsights: session.reflection.keyLearningsAndInsights,
          concernsOrRedFlags: session.reflection.concernsOrRedFlags,
          nextActionNotes: session.reflection.nextActionNotes,
          recordedAt: session.reflection.recordedAt.toISOString(),
        }
      : undefined,
    isCompleted: session.isCompleted,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }));

  const proposedSchedules: ProposedScheduleDTO[] = application.proposedSchedules.map((proposal) => ({
    id: proposal.id.value,
    stageCode: proposal.stage.code,
    stageLabel: proposal.stage.label,
    statusCode: proposal.status.code,
    statusLabel: proposal.status.label,
    formatType: proposal.format.type,
    formatSummary: proposal.format.getDisplaySummary(),
    note: proposal.note,
    slots: proposal.slots.map((slot, index) => ({
      slotIndex: index,
      startTime: slot.start.toISOString(),
      endTime: slot.end.toISOString(),
      timeWindowJP: slot.formatJP(),
    })),
    confirmedSlotIndex: proposal.confirmedSlotIndex,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  }));

  const todos: PreparationTodoDTO[] = application.todos.map((todo) => ({
    id: todo.id.value,
    applicationId: todo.applicationId.value,
    interviewSessionId: todo.interviewSessionId?.value,
    taskTypeCode: todo.taskType.code,
    title: todo.title,
    description: todo.description,
    statusCode: todo.status.code,
    statusLabel: todo.status.label,
    priorityLevel: todo.priority.level,
    priorityLabel: todo.priority.label,
    priorityColor: todo.priority.color,
    isBlocking: todo.taskType.isBlocking,
    dueDate: todo.dueDate?.toISOString(),
    createdAt: todo.createdAt.toISOString(),
    completedAt: todo.completedAt?.toISOString(),
  }));

  return {
    id: application.id.value,
    companyId: application.companyId.value,
    companyName,
    positionTitle: application.positionDetails.title,
    jobDescriptionUrl: application.positionDetails.jobDescriptionUrl,
    salaryMin: application.positionDetails.expectedSalaryRange.minAmount,
    salaryMax: application.positionDetails.expectedSalaryRange.maxAmount,
    salaryFormatted: application.positionDetails.expectedSalaryRange.formatJP(),
    targetSeniority: application.positionDetails.targetSeniority,
    desirabilityRating: application.positionDetails.desirabilityRating,
    whyThisRole: application.motivation.whyThisRole,
    valueProposition: application.motivation.valueProposition,
    careerGrowthAlignment: application.motivation.careerGrowthAlignment,
    currentStageCode: application.currentStage.code,
    currentStageLabel: application.currentStage.label,
    statusCode: application.status.code,
    statusLabel: application.status.label,
    isTerminal: application.status.isTerminal,
    sessions,
    proposedSchedules,
    todos,
    version: application.version,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

export function toEventDTO(event: IDomainEvent): DomainEventDTO {
  return {
    eventId: event.eventId,
    aggregateId: event.aggregateId,
    eventType: event.eventType,
    occurredOn: event.occurredOn.toISOString(),
    payload: event.payload,
  };
}
