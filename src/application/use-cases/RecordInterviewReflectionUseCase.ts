import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { IEventBus } from '../events/IEventBus';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { InterviewSessionId } from '@/domain/interview/InterviewSessionId';
import { InterviewReflection, PerformanceRating } from '@/domain/interview/InterviewReflection';
import { Result } from '@/domain/shared/Result';

export interface RecordInterviewReflectionCommand {
  applicationId: string;
  sessionId: string;
  candidatePerformanceRating: PerformanceRating;
  companyImpressionRating: PerformanceRating;
  keyLearningsAndInsights: string;
  concernsOrRedFlags?: string;
  nextActionNotes: string;
}

export class RecordInterviewReflectionUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: RecordInterviewReflectionCommand): Promise<Result<void>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const sessIdRes = InterviewSessionId.create(command.sessionId);
    if (sessIdRes.isFailure()) return Result.fail(sessIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const reflectionRes = InterviewReflection.create({
      candidatePerformanceRating: command.candidatePerformanceRating,
      companyImpressionRating: command.companyImpressionRating,
      keyLearningsAndInsights: command.keyLearningsAndInsights,
      concernsOrRedFlags: command.concernsOrRedFlags,
      nextActionNotes: command.nextActionNotes,
    });
    if (reflectionRes.isFailure()) return Result.fail(reflectionRes.getError());

    const res = app.recordInterviewReflection(sessIdRes.getValue(), reflectionRes.getValue());
    if (res.isFailure()) return res;

    await this.applicationRepo.save(app);
    await this.eventBus.publishAll(app.domainEvents);
    app.clearEvents();

    return Result.ok(undefined);
  }
}
