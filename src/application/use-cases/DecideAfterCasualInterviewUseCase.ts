import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { Result } from '@/domain/shared/Result';
import { IEventBus } from '../events/IEventBus';

export interface DecideAfterCasualInterviewCommand {
  applicationId: string;
  decision: 'PROCEED' | 'WITHDRAW';
  reason?: string;
}

export class DecideAfterCasualInterviewUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(
    command: DecideAfterCasualInterviewCommand
  ): Promise<Result<{ nextStageName: string }>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const decided = app.decideAfterCasualInterview(command.decision, command.reason);
    if (decided.isFailure()) return Result.fail(decided.getError());

    await this.applicationRepo.save(app);
    await this.eventBus.publishAll(app.domainEvents);
    app.clearEvents();
    return Result.ok({ nextStageName: decided.getValue().nextStage.label });
  }
}