import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { Result } from '@/domain/shared/Result';

export interface RejectOrWithdrawApplicationCommand {
  applicationId: string;
  action: 'REJECT' | 'WITHDRAW' | 'ACCEPT_OFFER';
  reason?: string;
}

export class RejectOrWithdrawApplicationUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
  ) {}

  public async execute(command: RejectOrWithdrawApplicationCommand): Promise<Result<void>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    let res: Result<void>;
    if (command.action === 'ACCEPT_OFFER') {
      res = app.acceptOffer();
    } else if (command.action === 'REJECT') {
      res = app.reject(command.reason);
    } else {
      res = app.withdraw(command.reason);
    }

    if (res.isFailure()) return res;

    await this.applicationRepo.save(app);
    return Result.ok(undefined);
  }
}
