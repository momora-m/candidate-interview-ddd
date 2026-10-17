import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { IEventBus } from '../events/IEventBus';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { InterviewSessionId } from '@/domain/interview/InterviewSessionId';
import { Result } from '@/domain/shared/Result';

export interface AssignReverseQuestionCommand {
  applicationId: string;
  sessionId: string;
  stockedQuestionId: string;
  customizedText?: string;
}

export class AssignReverseQuestionUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly companyRepo: ITargetCompanyRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: AssignReverseQuestionCommand): Promise<Result<void>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const sessIdRes = InterviewSessionId.create(command.sessionId);
    if (sessIdRes.isFailure()) return Result.fail(sessIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const company = await this.companyRepo.findById(app.companyId);
    if (!company) {
      return Result.fail('企業マスターが見つかりません。');
    }

    const stocked = company.stockedQuestions.find((q) => q.id === command.stockedQuestionId);
    if (!stocked) {
      return Result.fail(`逆質問 (ID: ${command.stockedQuestionId}) が企業プールに見つかりません。`);
    }

    const res = app.assignStockedQuestion(sessIdRes.getValue(), stocked, command.customizedText);
    if (res.isFailure()) return res;

    await this.applicationRepo.save(app);
    await this.eventBus.publishAll(app.domainEvents);
    app.clearEvents();

    return Result.ok(undefined);
  }
}
