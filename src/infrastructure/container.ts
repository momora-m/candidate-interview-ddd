import {
  createInMemoryCandidateRuntime,
  type CandidateRuntime,
} from '@/infrastructure/createCandidateRuntime';
import {
  TargetCompanyDTO,
  JobApplicationDTO,
  DomainEventDTO,
} from '@/application/dtos/CandidateApplicationDTOs';

export class CandidateAppContainer {
  private readonly runtime: CandidateRuntime = createInMemoryCandidateRuntime();
  private initialized = false;

  public get companyRepo() {
    return this.runtime.companyRepository;
  }

  public get applicationRepo() {
    return this.runtime.applicationRepository;
  }

  public get eventBus() {
    return this.runtime.eventBus;
  }

  public get createTargetCompany() {
    return this.runtime.useCases.createTargetCompany;
  }

  public get addStockedReverseQuestion() {
    return this.runtime.useCases.addStockedReverseQuestion;
  }

  public get createJobApplication() {
    return this.runtime.useCases.createJobApplication;
  }

  public get scheduleInterview() {
    return this.runtime.useCases.scheduleInterview;
  }

  public get proposeSchedule() {
    return this.runtime.useCases.proposeSchedule;
  }

  public get confirmProposedSchedule() {
    return this.runtime.useCases.confirmProposedSchedule;
  }

  public get cancelProposedSchedule() {
    return this.runtime.useCases.cancelProposedSchedule;
  }

  public get decideAfterCasualInterview() {
    return this.runtime.useCases.decideAfterCasualInterview;
  }

  public get rescheduleInterview() {
    return this.runtime.useCases.rescheduleInterview;
  }

  public get assignReverseQuestion() {
    return this.runtime.useCases.assignReverseQuestion;
  }

  public get recordQuestionAnswer() {
    return this.runtime.useCases.recordQuestionAnswer;
  }

  public get recordInterviewReflection() {
    return this.runtime.useCases.recordInterviewReflection;
  }

  public get toggleTodoStatus() {
    return this.runtime.useCases.toggleTodoStatus;
  }

  public get advanceSelectionStage() {
    return this.runtime.useCases.advanceSelectionStage;
  }

  public get rejectOrWithdrawApplication() {
    return this.runtime.useCases.rejectOrWithdrawApplication;
  }

  public get addCustomTodo() {
    return this.runtime.useCases.addCustomTodo;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await this.runtime.prepare();
    this.initialized = true;
  }

  public async getDashboardData(): Promise<{
    companies: TargetCompanyDTO[];
    applications: JobApplicationDTO[];
    events: DomainEventDTO[];
  }> {
    await this.init();
    const [companies, applications, events] = await Promise.all([
      this.runtime.queries.listCompanies(),
      this.runtime.queries.listApplications(),
      this.runtime.queries.listEvents(),
    ]);
    return { companies, applications, events };
  }
}

export const container = new CandidateAppContainer();
