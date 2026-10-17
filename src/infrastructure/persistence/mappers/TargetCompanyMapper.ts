import { BusinessModel, type TargetAudience } from '@/domain/company/BusinessModel';
import { CompanyId } from '@/domain/company/CompanyId';
import { CompanyProfile } from '@/domain/company/CompanyProfile';
import { StockedReverseQuestion, type QuestionCategory, type TargetInterviewerRole } from '@/domain/company/StockedReverseQuestion';
import { TargetCompany } from '@/domain/company/TargetCompany';
import { TechStackProfile, type CloudPlatformType } from '@/domain/company/TechStackProfile';
import { asDate, asOptionalString, asStringArray, unwrap } from '../sql';

export interface TargetCompanyRow {
  id: string;
  name: string;
  product_summary: string;
  target_audience: string;
  revenue_stream: string;
  key_competitors: unknown;
  primary_languages: unknown;
  cloud_platform: string;
  architecture_highlights: unknown;
  tech_blog_urls: unknown;
  overall_attractiveness_summary: string | null;
  corporate_mission: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface StockedQuestionRow {
  id: string;
  company_id: string;
  category: string;
  target_role: string;
  question_text: string;
  hypothesis_or_intent: string;
  sort_order: number | string;
}

export function targetCompanyToParams(company: TargetCompany): unknown[] {
  const profile = company.profile;
  return [
    company.id.value,
    company.name,
    profile.businessModel.productSummary,
    profile.businessModel.targetAudience,
    profile.businessModel.revenueStream,
    [...profile.businessModel.keyCompetitors],
    [...profile.techStack.primaryLanguages],
    profile.techStack.cloudPlatform,
    [...profile.techStack.architectureHighlights],
    [...profile.techStack.techBlogUrls],
    profile.overallAttractivenessSummary ?? null,
    profile.corporateMission ?? null,
    company.createdAt,
    company.updatedAt,
  ];
}

export function stockedQuestionToRow(
  companyId: string,
  question: StockedReverseQuestion,
  sortOrder: number
): unknown[] {
  return [
    question.id,
    companyId,
    question.category,
    question.targetRole,
    question.questionText,
    question.hypothesisOrIntent,
    sortOrder,
  ];
}

export function toTargetCompany(
  row: TargetCompanyRow,
  questions: readonly StockedQuestionRow[]
): TargetCompany {
  const context = `TargetCompany(${row.id})`;
  const businessModel = unwrap(
    BusinessModel.create({
      productSummary: row.product_summary,
      targetAudience: row.target_audience as TargetAudience,
      revenueStream: row.revenue_stream,
      keyCompetitors: asStringArray(row.key_competitors, `${context}.keyCompetitors`),
    }),
    `${context} の BusinessModel`
  );
  const techStack = unwrap(
    TechStackProfile.create({
      primaryLanguages: asStringArray(row.primary_languages, `${context}.primaryLanguages`),
      cloudPlatform: row.cloud_platform as CloudPlatformType,
      architectureHighlights: asStringArray(
        row.architecture_highlights,
        `${context}.architectureHighlights`
      ),
      techBlogUrls: asStringArray(row.tech_blog_urls, `${context}.techBlogUrls`),
    }),
    `${context} の TechStackProfile`
  );
  const profile = unwrap(
    CompanyProfile.create({
      businessModel,
      techStack,
      overallAttractivenessSummary: asOptionalString(row.overall_attractiveness_summary),
      corporateMission: asOptionalString(row.corporate_mission),
    }),
    `${context} の CompanyProfile`
  );

  const stockedQuestions = questions.map((question) =>
    unwrap(
      StockedReverseQuestion.create({
        id: question.id,
        category: question.category as QuestionCategory,
        targetRole: question.target_role as TargetInterviewerRole,
        questionText: question.question_text,
        hypothesisOrIntent: question.hypothesis_or_intent,
      }),
      `${context} の StockedReverseQuestion(${question.id})`
    )
  );

  return TargetCompany.hydrate({
    id: unwrap(CompanyId.create(row.id), `${context} の CompanyId`),
    name: row.name,
    profile,
    stockedQuestions,
    createdAt: asDate(row.created_at, `${context}.createdAt`),
    updatedAt: asDate(row.updated_at, `${context}.updatedAt`),
  });
}
