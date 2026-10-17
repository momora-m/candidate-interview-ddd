import { InMemoryTargetCompanyRepository } from './repositories/InMemoryTargetCompanyRepository';
import { InMemoryJobApplicationRepository } from './repositories/InMemoryJobApplicationRepository';
import { InMemoryEventBus } from './event-bus/InMemoryEventBus';
import { CreateTargetCompanyUseCase } from '@/application/use-cases/CreateTargetCompanyUseCase';
import { AddStockedReverseQuestionUseCase } from '@/application/use-cases/AddStockedReverseQuestionUseCase';
import { CreateJobApplicationUseCase } from '@/application/use-cases/CreateJobApplicationUseCase';
import { ScheduleInterviewUseCase } from '@/application/use-cases/ScheduleInterviewUseCase';
import { RescheduleInterviewUseCase } from '@/application/use-cases/RescheduleInterviewUseCase';
import { AssignReverseQuestionUseCase } from '@/application/use-cases/AssignReverseQuestionUseCase';
import { RecordQuestionAnswerUseCase } from '@/application/use-cases/RecordQuestionAnswerUseCase';
import { RecordInterviewReflectionUseCase } from '@/application/use-cases/RecordInterviewReflectionUseCase';
import { ToggleTodoStatusUseCase } from '@/application/use-cases/ToggleTodoStatusUseCase';
import { AdvanceSelectionStageUseCase } from '@/application/use-cases/AdvanceSelectionStageUseCase';
import { RejectOrWithdrawApplicationUseCase } from '@/application/use-cases/RejectOrWithdrawApplicationUseCase';
import { AddCustomTodoUseCase } from '@/application/use-cases/AddCustomTodoUseCase';
import { seedCandidateData } from './seeds/SeedCandidateData';
import {
  TargetCompanyDTO,
  JobApplicationDTO,
  InterviewSessionDTO,
  PreparationTodoDTO,
  DomainEventDTO,
} from '@/application/dtos/CandidateApplicationDTOs';

export class CandidateAppContainer {
  public readonly companyRepo = new InMemoryTargetCompanyRepository();
  public readonly applicationRepo = new InMemoryJobApplicationRepository();
  public readonly eventBus = new InMemoryEventBus();

  // Use Cases
  public readonly createTargetCompany = new CreateTargetCompanyUseCase(
    this.companyRepo,
    this.eventBus
  );

  public readonly addStockedReverseQuestion = new AddStockedReverseQuestionUseCase(
    this.companyRepo,
    this.eventBus
  );

  public readonly createJobApplication = new CreateJobApplicationUseCase(
    this.applicationRepo,
    this.companyRepo,
    this.eventBus
  );

  public readonly scheduleInterview = new ScheduleInterviewUseCase(
    this.applicationRepo,
    this.eventBus
  );

  public readonly rescheduleInterview = new RescheduleInterviewUseCase(
    this.applicationRepo,
    this.eventBus
  );

  public readonly assignReverseQuestion = new AssignReverseQuestionUseCase(
    this.applicationRepo,
    this.companyRepo,
    this.eventBus
  );

  public readonly recordQuestionAnswer = new RecordQuestionAnswerUseCase(
    this.applicationRepo,
    this.eventBus
  );

  public readonly recordInterviewReflection = new RecordInterviewReflectionUseCase(
    this.applicationRepo,
    this.eventBus
  );

  public readonly toggleTodoStatus = new ToggleTodoStatusUseCase(
    this.applicationRepo,
    this.eventBus
  );

  public readonly advanceSelectionStage = new AdvanceSelectionStageUseCase(
    this.applicationRepo,
    this.eventBus
  );

  public readonly rejectOrWithdrawApplication = new RejectOrWithdrawApplicationUseCase(
    this.applicationRepo,
    this.eventBus
  );

  public readonly addCustomTodo = new AddCustomTodoUseCase(
    this.applicationRepo,
    this.eventBus
  );

  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    await seedCandidateData(this.companyRepo, this.applicationRepo, this.eventBus);
    this.initialized = true;
  }

  public async getDashboardData(): Promise<{
    companies: TargetCompanyDTO[];
    applications: JobApplicationDTO[];
    events: DomainEventDTO[];
  }> {
    await this.init();

    const [rawCompanies, rawApps] = await Promise.all([
      this.companyRepo.findAll(),
      this.applicationRepo.findAll(),
    ]);

    const companyMap = new Map(rawCompanies.map((c) => [c.id.value, c]));

    const companyDTOs: TargetCompanyDTO[] = rawCompanies.map((c) => ({
      id: c.id.value,
      name: c.name,
      businessModel: {
        productSummary: c.profile.businessModel.productSummary,
        targetAudience: c.profile.businessModel.targetAudience,
        revenueStream: c.profile.businessModel.revenueStream,
        keyCompetitors: [...c.profile.businessModel.keyCompetitors],
      },
      techStack: {
        primaryLanguages: [...c.profile.techStack.primaryLanguages],
        cloudPlatform: c.profile.techStack.cloudPlatform,
        architectureHighlights: [...c.profile.techStack.architectureHighlights],
        techBlogUrls: [...c.profile.techStack.techBlogUrls],
      },
      overallAttractivenessSummary: c.profile.overallAttractivenessSummary,
      corporateMission: c.profile.corporateMission,
      stockedQuestions: c.stockedQuestions.map((q) => ({
        id: q.id,
        category: q.category,
        categoryLabel: q.categoryLabel,
        targetRole: q.targetRole,
        targetRoleLabel: q.targetRoleLabel,
        questionText: q.questionText,
        hypothesisOrIntent: q.hypothesisOrIntent,
      })),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const applicationDTOs: JobApplicationDTO[] = rawApps.map((a) => {
      const company = companyMap.get(a.companyId.value);

      const sessionDTOs: InterviewSessionDTO[] = a.sessions.map((s) => ({
        id: s.id.value,
        stageCode: s.stage.code,
        stageLabel: s.stage.label,
        startTime: s.timeWindow.start.toISOString(),
        endTime: s.timeWindow.end.toISOString(),
        timeWindowJP: s.timeWindow.formatJP(),
        durationMinutes: s.timeWindow.durationMinutes,
        formatType: s.format.type,
        formatSummary: s.format.getDisplaySummary(),
        meetingUrl: s.format.onlineDetails?.meetingUrl.url,
        locationName: s.format.inPersonDetails?.locationName,
        roomName: s.format.inPersonDetails?.roomName,
        travelBufferMinutes: s.format.travelBufferMinutes,
        interviewerNames: [...s.interviewerNames],
        assignedQuestions: s.assignedQuestions.map((q) => ({
          id: q.id,
          sourceQuestionId: q.sourceQuestionId,
          category: q.category,
          customizedQuestionText: q.customizedQuestionText,
          isAsked: q.isAsked,
          obtainedAnswer: q.obtainedAnswer,
          insightRating: q.insightRating,
        })),
        reflection: s.reflection
          ? {
              candidatePerformanceRating: s.reflection.candidatePerformanceRating,
              companyImpressionRating: s.reflection.companyImpressionRating,
              keyLearningsAndInsights: s.reflection.keyLearningsAndInsights,
              concernsOrRedFlags: s.reflection.concernsOrRedFlags,
              nextActionNotes: s.reflection.nextActionNotes,
              recordedAt: s.reflection.recordedAt.toISOString(),
            }
          : undefined,
        isCompleted: s.isCompleted,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      const todoDTOs: PreparationTodoDTO[] = a.todos.map((t) => ({
        id: t.id.value,
        applicationId: t.applicationId.value,
        interviewSessionId: t.interviewSessionId?.value,
        taskTypeCode: t.taskType.code,
        title: t.title,
        description: t.description,
        statusCode: t.status.code,
        statusLabel: t.status.label,
        priorityLevel: t.priority.level,
        priorityLabel: t.priority.label,
        priorityColor: t.priority.color,
        isBlocking: t.taskType.isBlocking,
        dueDate: t.dueDate?.toISOString(),
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString(),
      }));

      return {
        id: a.id.value,
        companyId: a.companyId.value,
        companyName: company ? company.name : 'Unknown Company',
        positionTitle: a.positionDetails.title,
        jobDescriptionUrl: a.positionDetails.jobDescriptionUrl,
        salaryMin: a.positionDetails.expectedSalaryRange.minAmount,
        salaryMax: a.positionDetails.expectedSalaryRange.maxAmount,
        salaryFormatted: a.positionDetails.expectedSalaryRange.formatJP(),
        targetSeniority: a.positionDetails.targetSeniority,
        desirabilityRating: a.positionDetails.desirabilityRating,
        whyThisRole: a.motivation.whyThisRole,
        valueProposition: a.motivation.valueProposition,
        careerGrowthAlignment: a.motivation.careerGrowthAlignment,
        currentStageCode: a.currentStage.code,
        currentStageLabel: a.currentStage.label,
        statusCode: a.status.code,
        statusLabel: a.status.label,
        isTerminal: a.status.isTerminal,
        sessions: sessionDTOs,
        todos: todoDTOs,
        version: a.version,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    });

    const eventDTOs: DomainEventDTO[] = this.eventBus.getHistory().map((e) => ({
      eventId: e.eventId,
      aggregateId: e.aggregateId,
      eventType: e.eventType,
      occurredOn: e.occurredOn.toISOString(),
      payload: e.payload,
    }));

    return {
      companies: companyDTOs,
      applications: applicationDTOs,
      events: eventDTOs,
    };
  }
}

export const container = new CandidateAppContainer();
