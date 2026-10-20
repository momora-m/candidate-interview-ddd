import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { InterviewSessionId } from '@/domain/interview/InterviewSessionId';
import { TimeWindow } from '@/domain/interview/TimeWindow';
import { CandidateScheduleConflictDomainService } from '@/domain/services/CandidateScheduleConflictDomainService';
import { Result } from '@/domain/shared/Result';
import {
  conflictMessage,
  interviewFormatFromCommand,
  type InterviewFormatCommand,
} from '../interviewFormatFromCommand';

export interface ReviseInterviewCommand extends InterviewFormatCommand {
  applicationId: string;
  sessionId: string;
  startTime: string | Date;
  endTime: string | Date;
  interviewerNames?: string[];
}

export class ReviseInterviewUseCase {
  private conflictService = new CandidateScheduleConflictDomainService();

  constructor(private readonly applicationRepo: IJobApplicationRepository) {}

  public async execute(command: ReviseInterviewCommand): Promise<Result<void>> {
    const applicationId = ApplicationId.create(command.applicationId);
    if (applicationId.isFailure()) return Result.fail(applicationId.getError());

    const sessionId = InterviewSessionId.create(command.sessionId);
    if (sessionId.isFailure()) return Result.fail(sessionId.getError());

    const application = await this.applicationRepo.findById(applicationId.getValue());
    if (!application) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const session = application.sessions.find((item) => item.id.equals(sessionId.getValue()));
    if (!session) {
      return Result.fail(`面接セッション (ID: ${command.sessionId}) が見つかりません。`);
    }
    if (session.isCompleted) {
      return Result.fail('完了済みの面接セッションは訂正できません。');
    }

    const timeWindow = TimeWindow.create(command.startTime, command.endTime);
    if (timeWindow.isFailure()) return Result.fail(timeWindow.getError());

    const format = interviewFormatFromCommand(command);
    if (format.isFailure()) return Result.fail(format.getError());

    const conflict = this.conflictService.checkConflicts(
      timeWindow.getValue(),
      format.getValue(),
      await this.applicationRepo.findAll(),
      session.id
    );
    if (conflict.isFailure()) {
      const detail = conflict.getError();
      return Result.fail(
        conflictMessage(
          '【面接訂正の重複】',
          detail.overlapReason,
          detail.conflictingStageName,
          detail.conflictingTimeWindowJP
        )
      );
    }

    const revised = application.reviseInterview(session.id, {
      timeWindow: timeWindow.getValue(),
      format: format.getValue(),
      interviewerNames: command.interviewerNames ?? [],
    });
    if (revised.isFailure()) return Result.fail(revised.getError());

    await this.applicationRepo.save(application);
    return Result.ok(undefined);
  }
}
