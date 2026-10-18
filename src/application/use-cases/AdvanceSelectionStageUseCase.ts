import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { Result } from '@/domain/shared/Result';

export interface AdvanceSelectionStageCommand {
  applicationId: string;
}

export class AdvanceSelectionStageUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
  ) {}

  public async execute(command: AdvanceSelectionStageCommand): Promise<Result<{ nextStageName: string }>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const res = app.advanceStage();
    if (res.isFailure()) return Result.fail(res.getError());

    await this.applicationRepo.save(app);
    return Result.ok({ nextStageName: res.getValue().nextStage.label });
  }
}
