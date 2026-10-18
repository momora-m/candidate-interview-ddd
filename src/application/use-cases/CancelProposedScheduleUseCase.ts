import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { ProposedScheduleId } from '@/domain/interview/ProposedScheduleId';
import { Result } from '@/domain/shared/Result';
import { IEventBus } from '../events/IEventBus';

export interface CancelProposedScheduleCommand {
  applicationId: string;
  proposalId: string;
}

export class CancelProposedScheduleUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: CancelProposedScheduleCommand): Promise<Result<void>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());
    const proposalIdRes = ProposedScheduleId.create(command.proposalId);
    if (proposalIdRes.isFailure()) return Result.fail(proposalIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const cancelled = app.cancelProposedSchedule(proposalIdRes.getValue());
    if (cancelled.isFailure()) return Result.fail(cancelled.getError());

    await this.applicationRepo.save(app);
    await this.eventBus.publishAll(app.domainEvents);
    app.clearEvents();
    return Result.ok(undefined);
  }
}
