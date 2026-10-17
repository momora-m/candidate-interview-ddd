import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { IEventBus } from '../events/IEventBus';
import { CompanyId } from '@/domain/company/CompanyId';
import { JobApplication } from '@/domain/application/JobApplication';
import { PositionDetails, DesirabilityRating } from '@/domain/application/PositionDetails';
import { SalaryRange } from '@/domain/application/SalaryRange';
import { PositionMotivation } from '@/domain/application/PositionMotivation';
import { StageCode } from '@/domain/application/SelectionStage';
import { Result } from '@/domain/shared/Result';

export interface CreateJobApplicationCommand {
  companyId: string;
  positionTitle: string;
  jobDescriptionUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  targetSeniority?: string;
  desirabilityRating?: DesirabilityRating;
  whyThisRole?: string;
  valueProposition?: string;
  careerGrowthAlignment?: string;
  initialStageCode?: StageCode;
}

export class CreateJobApplicationUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly companyRepo: ITargetCompanyRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: CreateJobApplicationCommand): Promise<Result<JobApplication>> {
    const compIdRes = CompanyId.create(command.companyId);
    if (compIdRes.isFailure()) return Result.fail(compIdRes.getError());

    const company = await this.companyRepo.findById(compIdRes.getValue());
    if (!company) {
      return Result.fail(`企業 (ID: ${command.companyId}) が存在しません。`);
    }

    const salaryRes = SalaryRange.create({
      minAmount: command.salaryMin,
      maxAmount: command.salaryMax,
    });
    if (salaryRes.isFailure()) return Result.fail(salaryRes.getError());

    const posRes = PositionDetails.create({
      title: command.positionTitle,
      jobDescriptionUrl: command.jobDescriptionUrl,
      expectedSalaryRange: salaryRes.getValue(),
      targetSeniority: command.targetSeniority,
      desirabilityRating: command.desirabilityRating,
    });
    if (posRes.isFailure()) return Result.fail(posRes.getError());

    const motRes = PositionMotivation.create({
      whyThisRole: command.whyThisRole,
      valueProposition: command.valueProposition,
      careerGrowthAlignment: command.careerGrowthAlignment,
    });
    if (motRes.isFailure()) return Result.fail(motRes.getError());

    const appRes = JobApplication.create({
      companyId: company.id,
      positionDetails: posRes.getValue(),
      motivation: motRes.getValue(),
      initialStageCode: command.initialStageCode,
    });
    if (appRes.isFailure()) return Result.fail(appRes.getError());

    const app = appRes.getValue();
    await this.applicationRepo.save(app);
    await this.eventBus.publishAll(app.domainEvents);
    app.clearEvents();

    return Result.ok(app);
  }
}
