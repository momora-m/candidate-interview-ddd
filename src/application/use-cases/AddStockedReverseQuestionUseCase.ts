import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { IEventBus } from '../events/IEventBus';
import { CompanyId } from '@/domain/company/CompanyId';
import {
  StockedReverseQuestion,
  QuestionCategory,
  TargetInterviewerRole,
} from '@/domain/company/StockedReverseQuestion';
import { Result } from '@/domain/shared/Result';

export interface AddStockedReverseQuestionCommand {
  companyId: string;
  category: QuestionCategory;
  targetRole: TargetInterviewerRole;
  questionText: string;
  hypothesisOrIntent: string;
}

export class AddStockedReverseQuestionUseCase {
  constructor(
    private readonly companyRepo: ITargetCompanyRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: AddStockedReverseQuestionCommand): Promise<Result<{ questionId: string }>> {
    const idRes = CompanyId.create(command.companyId);
    if (idRes.isFailure()) return Result.fail(idRes.getError());

    const company = await this.companyRepo.findById(idRes.getValue());
    if (!company) {
      return Result.fail(`企業 (ID: ${command.companyId}) が見つかりません。`);
    }

    const questionRes = StockedReverseQuestion.create({
      category: command.category,
      targetRole: command.targetRole,
      questionText: command.questionText,
      hypothesisOrIntent: command.hypothesisOrIntent,
    });
    if (questionRes.isFailure()) return Result.fail(questionRes.getError());

    const question = questionRes.getValue();
    const addRes = company.addStockedQuestion(question);
    if (addRes.isFailure()) return Result.fail(addRes.getError());

    await this.companyRepo.save(company);
    await this.eventBus.publishAll(company.domainEvents);
    company.clearEvents();

    return Result.ok({ questionId: question.id });
  }
}
