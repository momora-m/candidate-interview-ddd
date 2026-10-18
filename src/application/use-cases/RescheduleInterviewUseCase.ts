import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { InterviewSessionId } from '@/domain/interview/InterviewSessionId';
import { TimeWindow } from '@/domain/interview/TimeWindow';
import { CandidateScheduleConflictDomainService } from '@/domain/services/CandidateScheduleConflictDomainService';
import { Result } from '@/domain/shared/Result';

export interface RescheduleInterviewCommand {
  applicationId: string;
  sessionId: string;
  newStartTime: string | Date;
  newEndTime: string | Date;
}

export class RescheduleInterviewUseCase {
  private conflictService = new CandidateScheduleConflictDomainService();

  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
  ) {}

  public async execute(command: RescheduleInterviewCommand): Promise<Result<void>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const sessIdRes = InterviewSessionId.create(command.sessionId);
    if (sessIdRes.isFailure()) return Result.fail(sessIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const session = app.sessions.find((s) => s.id.equals(sessIdRes.getValue()));
    if (!session) {
      return Result.fail(`面接セッション (ID: ${command.sessionId}) が見つかりません。`);
    }

    const timeWindowRes = TimeWindow.create(command.newStartTime, command.newEndTime);
    if (timeWindowRes.isFailure()) return Result.fail(timeWindowRes.getError());
    const newTimeWindow = timeWindowRes.getValue();

    // Check conflict
    const allApps = await this.applicationRepo.findAll();
    const conflictRes = this.conflictService.checkConflicts(
      newTimeWindow,
      session.format,
      allApps,
      session.id
    );

    if (conflictRes.isFailure()) {
      return Result.fail(`【日程変更重複】${conflictRes.getError().overlapReason}`);
    }

    const res = app.rescheduleInterview(session.id, newTimeWindow);
    if (res.isFailure()) return res;

    await this.applicationRepo.save(app);
    return Result.ok(undefined);
  }
}
