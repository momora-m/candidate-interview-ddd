import { createCandidateUseCases } from '@/application/createCandidateUseCases';
import { toApplicationDTO, toCompanyDTO, toEventDTO } from '@/application/read-model/candidateReadModel';
import { InMemoryTargetCompanyRepository } from './repositories/InMemoryTargetCompanyRepository';
import { InMemoryJobApplicationRepository } from './repositories/InMemoryJobApplicationRepository';
import { InMemoryEventBus } from './event-bus/InMemoryEventBus';
import { seedCandidateData } from './seeds/SeedCandidateData';
import {
  TargetCompanyDTO,
  JobApplicationDTO,
  DomainEventDTO,
} from '@/application/dtos/CandidateApplicationDTOs';

export class CandidateAppContainer {
  public readonly companyRepo = new InMemoryTargetCompanyRepository();
  public readonly applicationRepo = new InMemoryJobApplicationRepository();
  public readonly eventBus = new InMemoryEventBus();

  private readonly useCases = createCandidateUseCases(
    this.companyRepo,
    this.applicationRepo,
    this.eventBus
  );

  public get createTargetCompany() {
    return this.useCases.createTargetCompany;
  }

  public get addStockedReverseQuestion() {
    return this.useCases.addStockedReverseQuestion;
  }

  public get createJobApplication() {
    return this.useCases.createJobApplication;
  }

  public get scheduleInterview() {
    return this.useCases.scheduleInterview;
  }

  public get rescheduleInterview() {
    return this.useCases.rescheduleInterview;
  }

  public get assignReverseQuestion() {
    return this.useCases.assignReverseQuestion;
  }

  public get recordQuestionAnswer() {
    return this.useCases.recordQuestionAnswer;
  }

  public get recordInterviewReflection() {
    return this.useCases.recordInterviewReflection;
  }

  public get toggleTodoStatus() {
    return this.useCases.toggleTodoStatus;
  }

  public get advanceSelectionStage() {
    return this.useCases.advanceSelectionStage;
  }

  public get rejectOrWithdrawApplication() {
    return this.useCases.rejectOrWithdrawApplication;
  }

  public get addCustomTodo() {
    return this.useCases.addCustomTodo;
  }

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

    const companyNames = new Map(rawCompanies.map((company) => [company.id.value, company.name]));

    const companyDTOs: TargetCompanyDTO[] = rawCompanies.map(toCompanyDTO);

    const applicationDTOs: JobApplicationDTO[] = rawApps.map((application) =>
      toApplicationDTO(application, companyNames.get(application.companyId.value))
    );

    const eventDTOs: DomainEventDTO[] = this.eventBus.getHistory().map(toEventDTO);

    return {
      companies: companyDTOs,
      applications: applicationDTOs,
      events: eventDTOs,
    };
  }
}

export const container = new CandidateAppContainer();
