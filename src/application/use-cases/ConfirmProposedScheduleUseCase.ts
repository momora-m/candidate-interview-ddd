import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { ProposedScheduleId } from '@/domain/interview/ProposedScheduleId';
import { CandidateScheduleConflictDomainService } from '@/domain/services/CandidateScheduleConflictDomainService';
import { Result } from '@/domain/shared/Result';
import { conflictMessage } from '../interviewFormatFromCommand';

export interface ConfirmProposedScheduleCommand {
  applicationId: string;
  proposalId: string;
  slotIndex: number;
}

export class ConfirmProposedScheduleUseCase {
  private conflictService = new CandidateScheduleConflictDomainService();

  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
  ) {}

  public async execute(
    command: ConfirmProposedScheduleCommand
  ): Promise<Result<{ sessionId: string }>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());
    const proposalIdRes = ProposedScheduleId.create(command.proposalId);
    if (proposalIdRes.isFailure()) return Result.fail(proposalIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const proposal = app.proposedSchedules.find((item) => item.id.equals(proposalIdRes.getValue()));
    if (!proposal) {
      return Result.fail(`日程調整 (ID: ${command.proposalId}) が見つかりません。`);
    }
    const slot = proposal.slotAt(command.slotIndex);
    if (!slot) {
      return Result.fail('選択した候補日が見つかりません。');
    }

    const allApps = await this.applicationRepo.findAll();
    const conflictRes = this.conflictService.checkConflicts(
      slot,
      proposal.format,
      allApps,
      undefined,
      proposal.id
    );
    if (conflictRes.isFailure()) {
      const error = conflictRes.getError();
      return Result.fail(
        conflictMessage(
          '【候補日の確定不可】',
          error.overlapReason,
          error.conflictingStageName,
          error.conflictingTimeWindowJP
        )
      );
    }

    const confirmed = app.confirmProposedSchedule(proposal.id, command.slotIndex);
    if (confirmed.isFailure()) return Result.fail(confirmed.getError());

    await this.applicationRepo.save(app);
    return Result.ok({ sessionId: confirmed.getValue().id.value });
  }
}
