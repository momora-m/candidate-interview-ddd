import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { IEventBus } from '../events/IEventBus';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { SelectionStage, StageCode } from '@/domain/application/SelectionStage';
import { TimeWindow } from '@/domain/interview/TimeWindow';
import { CandidateScheduleConflictDomainService } from '@/domain/services/CandidateScheduleConflictDomainService';
import { Result } from '@/domain/shared/Result';
import {
  conflictMessage,
  interviewFormatFromCommand,
  type InterviewFormatCommand,
} from '../interviewFormatFromCommand';

export interface ScheduleInterviewCommand extends InterviewFormatCommand {
  applicationId: string;
  stageCode?: StageCode;
  startTime: string | Date;
  endTime: string | Date;
  interviewerNames?: string[];
}

export class ScheduleInterviewUseCase {
  private conflictService = new CandidateScheduleConflictDomainService();

  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: ScheduleInterviewCommand): Promise<Result<{ sessionId: string }>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const timeWindowRes = TimeWindow.create(command.startTime, command.endTime);
    if (timeWindowRes.isFailure()) return Result.fail(timeWindowRes.getError());
    const timeWindow = timeWindowRes.getValue();

    const formatRes = interviewFormatFromCommand(command);
    if (formatRes.isFailure()) return Result.fail(formatRes.getError());
    const format = formatRes.getValue();

    const allApps = await this.applicationRepo.findAll();
    const conflictRes = this.conflictService.checkConflicts(timeWindow, format, allApps);
    if (conflictRes.isFailure()) {
      const err = conflictRes.getError();
      return Result.fail(
        conflictMessage(
          '【面接日程重複エラー】',
          err.overlapReason,
          err.conflictingStageName,
          err.conflictingTimeWindowJP
        )
      );
    }

    let stage: SelectionStage | undefined;
    if (command.stageCode) {
      const stgRes = SelectionStage.create(command.stageCode);
      if (stgRes.isFailure()) return Result.fail(stgRes.getError());
      stage = stgRes.getValue();
    }

    const scheduleRes = app.scheduleInterview({
      stage,
      timeWindow,
      format,
      interviewerNames: command.interviewerNames,
    });
    if (scheduleRes.isFailure()) return Result.fail(scheduleRes.getError());

    await this.applicationRepo.save(app);
    await this.eventBus.publishAll(app.domainEvents);
    app.clearEvents();

    return Result.ok({ sessionId: scheduleRes.getValue().id.value });
  }
}
