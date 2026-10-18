import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { InterviewSessionId } from '@/domain/interview/InterviewSessionId';
import { InsightRating } from '@/domain/interview/AssignedReverseQuestion';
import { Result } from '@/domain/shared/Result';

export interface RecordQuestionAnswerCommand {
  applicationId: string;
  sessionId: string;
  questionId: string;
  answer: string;
  insightRating?: InsightRating;
}

export class RecordQuestionAnswerUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
  ) {}

  public async execute(command: RecordQuestionAnswerCommand): Promise<Result<void>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const sessIdRes = InterviewSessionId.create(command.sessionId);
    if (sessIdRes.isFailure()) return Result.fail(sessIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const res = app.recordQuestionAnswer(
      sessIdRes.getValue(),
      command.questionId,
      command.answer,
      command.insightRating
    );
    if (res.isFailure()) return res;

    await this.applicationRepo.save(app);
    return Result.ok(undefined);
  }
}
