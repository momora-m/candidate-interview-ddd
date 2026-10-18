import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { SelectionStage, type StageCode } from '@/domain/application/SelectionStage';
import { TimeWindow } from '@/domain/interview/TimeWindow';
import { CandidateScheduleConflictDomainService } from '@/domain/services/CandidateScheduleConflictDomainService';
import { Result } from '@/domain/shared/Result';
import {
  conflictMessage,
  interviewFormatFromCommand,
  type InterviewFormatCommand,
} from '../interviewFormatFromCommand';

export interface ProposeScheduleCommand extends InterviewFormatCommand {
  applicationId: string;
  stageCode?: StageCode;
  slots: { startTime: string | Date; endTime: string | Date }[];
  note?: string;
}

export class ProposeScheduleUseCase {
  private conflictService = new CandidateScheduleConflictDomainService();

  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
  ) {}

  public async execute(command: ProposeScheduleCommand): Promise<Result<{ proposalId: string }>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const windows: TimeWindow[] = [];
    for (const slot of command.slots) {
      const windowRes = TimeWindow.create(slot.startTime, slot.endTime);
      if (windowRes.isFailure()) return Result.fail(windowRes.getError());
      windows.push(windowRes.getValue());
    }

    const formatRes = interviewFormatFromCommand(command);
    if (formatRes.isFailure()) return Result.fail(formatRes.getError());
    const format = formatRes.getValue();

    const allApps = await this.applicationRepo.findAll();
    for (const window of windows) {
      const conflictRes = this.conflictService.checkConflicts(window, format, allApps);
      if (conflictRes.isFailure()) {
        const error = conflictRes.getError();
        return Result.fail(
          conflictMessage(
            '【候補日の重複】',
            error.overlapReason,
            error.conflictingStageName,
            error.conflictingTimeWindowJP
          )
        );
      }
    }

    let stage: SelectionStage | undefined;
    if (command.stageCode) {
      const stageRes = SelectionStage.create(command.stageCode);
      if (stageRes.isFailure()) return Result.fail(stageRes.getError());
      stage = stageRes.getValue();
    }

    const proposed = app.proposeSchedule({
      stage,
      slots: windows,
      format,
      note: command.note,
    });
    if (proposed.isFailure()) return Result.fail(proposed.getError());

    await this.applicationRepo.save(app);
    return Result.ok({ proposalId: proposed.getValue().id.value });
  }
}
