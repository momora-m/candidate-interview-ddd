import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CompanyProfile } from '../../src/domain/company/CompanyProfile';
import { BusinessModel } from '../../src/domain/company/BusinessModel';
import { TechStackProfile } from '../../src/domain/company/TechStackProfile';
import { StockedReverseQuestion } from '../../src/domain/company/StockedReverseQuestion';
import { TargetCompany } from '../../src/domain/company/TargetCompany';
import { CompanyId } from '../../src/domain/company/CompanyId';
import { JobApplication } from '../../src/domain/application/JobApplication';
import { PositionDetails } from '../../src/domain/application/PositionDetails';
import { PositionMotivation } from '../../src/domain/application/PositionMotivation';
import { InterviewFormat } from '../../src/domain/interview/InterviewFormat';
import { MeetingUrl } from '../../src/domain/interview/MeetingUrl';
import { TimeWindow } from '../../src/domain/interview/TimeWindow';
import { InterviewReflection } from '../../src/domain/interview/InterviewReflection';

function profile(summary: string): CompanyProfile {
  return CompanyProfile.create({
    businessModel: BusinessModel.create({
      productSummary: summary,
      targetAudience: 'B2B_SMB',
      revenueStream: '月額',
    }).getValue(),
    techStack: TechStackProfile.create({
      primaryLanguages: ['TypeScript'],
      cloudPlatform: 'GCP',
    }).getValue(),
  }).getValue();
}

describe('revising saved company and interview records', () => {
  test('replaces the company name and profile while keeping stocked questions', () => {
    const company = TargetCompany.create({
      name: '旧社名',
      profile: profile('旧事業'),
    }).getValue();
    const question = StockedReverseQuestion.create({
      category: 'CULTURE',
      targetRole: 'ENGINEERING_MANAGER',
      questionText: '評価制度を教えてください',
      hypothesisOrIntent: '成長機会を見たい',
    }).getValue();
    assert.equal(company.addStockedQuestion(question).isSuccess(), true);

    const revised = company.revise('新社名', profile('新事業'));
    assert.equal(revised.isSuccess(), true);
    assert.equal(company.name, '新社名');
    assert.equal(company.profile.businessModel.productSummary, '新事業');
    assert.equal(company.stockedQuestions.length, 1);
    assert.equal(company.stockedQuestions[0].questionText, '評価制度を教えてください');
    assert.equal(company.revise('  ', profile('新事業')).isSuccess(), false);
  });

  test('keeps the interview stage and moves only open task due dates', () => {
    const application = JobApplication.create({
      companyId: CompanyId.create('comp_1').getValue(),
      positionDetails: PositionDetails.create({ title: 'Backend Engineer' }).getValue(),
      motivation: PositionMotivation.create({ whyThisRole: '基盤を作りたい' }).getValue(),
      initialStageCode: 'FIRST_TECHNICAL',
    }).getValue();
    const scheduled = application.scheduleInterview({
      timeWindow: TimeWindow.create('2027-01-06T01:00:00.000Z', '2027-01-06T02:00:00.000Z').getValue(),
      format: InterviewFormat.createOnline(MeetingUrl.create('https://zoom.us/j/111').getValue()).getValue(),
      interviewerNames: ['佐藤'],
    });
    assert.equal(scheduled.isSuccess(), true);
    const session = scheduled.getValue();
    application.todos[0].markAsDone();

    const revised = application.reviseInterview(session.id, {
      timeWindow: TimeWindow.create('2027-02-02T05:00:00.000Z', '2027-02-02T06:30:00.000Z').getValue(),
      format: InterviewFormat.createInPerson('大阪本社', '会議室B', undefined, 30).getValue(),
      interviewerNames: ['鈴木'],
    });
    assert.equal(revised.isSuccess(), true);
    assert.equal(session.stage.code, 'FIRST_TECHNICAL');
    assert.equal(session.format.type, 'IN_PERSON');
    assert.equal(session.interviewerNames[0], '鈴木');
    assert.equal(application.todos[0].dueDate?.toISOString(), '2027-01-06T01:00:00.000Z');
    assert.ok(
      application.todos.slice(1).every((todo) => todo.dueDate?.toISOString() === '2027-02-02T05:00:00.000Z')
    );

    application.recordInterviewReflection(session.id, InterviewReflection.create({
      candidatePerformanceRating: 4,
      companyImpressionRating: 4,
      keyLearningsAndInsights: '設計の話が中心だった',
      nextActionNotes: '課題を送る',
    }).getValue());
    const locked = application.reviseInterview(session.id, {
      timeWindow: TimeWindow.create('2027-04-04T05:00:00.000Z', '2027-04-04T06:00:00.000Z').getValue(),
      format: session.format,
      interviewerNames: ['鈴木'],
    });
    assert.equal(locked.isSuccess(), false);
    assert.match(locked.getError(), /完了済み/);
  });
});