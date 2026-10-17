import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { ApplicationId } from '../../src/domain/application/ApplicationId';
import { PositionDetails } from '../../src/domain/application/PositionDetails';
import { PositionMotivation } from '../../src/domain/application/PositionMotivation';
import { SalaryRange } from '../../src/domain/application/SalaryRange';
import { SelectionStage } from '../../src/domain/application/SelectionStage';
import { JobApplication } from '../../src/domain/application/JobApplication';
import { BusinessModel } from '../../src/domain/company/BusinessModel';
import { CompanyId } from '../../src/domain/company/CompanyId';
import { CompanyProfile } from '../../src/domain/company/CompanyProfile';
import { StockedReverseQuestion } from '../../src/domain/company/StockedReverseQuestion';
import { TargetCompany } from '../../src/domain/company/TargetCompany';
import { TechStackProfile } from '../../src/domain/company/TechStackProfile';
import { InterviewFormat } from '../../src/domain/interview/InterviewFormat';
import { InterviewReflection } from '../../src/domain/interview/InterviewReflection';
import { MeetingUrl } from '../../src/domain/interview/MeetingUrl';
import { TimeWindow } from '../../src/domain/interview/TimeWindow';
import { TaskPriority } from '../../src/domain/todo/TaskPriority';
import { applySchema } from '../../src/infrastructure/persistence/applySchema';
import { PersistenceError } from '../../src/infrastructure/persistence/PersistenceError';
import { PostgresJobApplicationRepository } from '../../src/infrastructure/persistence/repositories/PostgresJobApplicationRepository';
import { PostgresTargetCompanyRepository } from '../../src/infrastructure/persistence/repositories/PostgresTargetCompanyRepository';
import type { SqlClient, SqlQuery } from '../../src/infrastructure/persistence/SqlClient';
import { PgliteDatabase } from './PgliteDatabase';

describe('PostgreSQL aggregate repositories', () => {
  let db: PgliteDatabase;
  let companies: PostgresTargetCompanyRepository;
  let applications: PostgresJobApplicationRepository;

  before(async () => {
    db = await PgliteDatabase.create();
    await applySchema(db);
    await applySchema(db);
    companies = new PostgresTargetCompanyRepository(db);
    applications = new PostgresJobApplicationRepository(db);
  });

  beforeEach(async () => {
    await db.query(`
      TRUNCATE TABLE
        assigned_reverse_questions,
        preparation_todos,
        interview_sessions,
        job_applications,
        stocked_reverse_questions,
        target_companies
      RESTART IDENTITY CASCADE
    `);
  });

  test('round-trips a company and replaces stocked questions on the next save', async () => {
    const company = sampleCompany();
    const createdAt = company.createdAt.getTime();
    await companies.save(company);

    const loaded = await companies.findById(company.id);
    assert.ok(loaded);
    assert.equal(loaded.name, '北極星テック');
    assert.equal(loaded.createdAt.getTime(), createdAt);
    assert.equal(loaded.profile.businessModel.targetAudience, 'B2B_SMB');
    assert.deepEqual([...loaded.profile.businessModel.keyCompetitors], ['南十字', 'オリオン']);
    assert.deepEqual([...loaded.profile.techStack.primaryLanguages], ['TypeScript', 'Go']);
    assert.equal(loaded.profile.techStack.cloudPlatform, 'GCP');
    assert.equal(loaded.profile.overallAttractivenessSummary, '少人数で事業と技術の両方に入れる');
    assert.deepEqual(
      loaded.stockedQuestions.map((question) => question.id),
      company.stockedQuestions.map((question) => question.id)
    );
    assert.equal(loaded.domainEvents.length, 0);
    assert.equal(await count(db, 'stocked_reverse_questions'), 2);

    const kept = company.stockedQuestions[1];
    const renamed = TargetCompany.hydrate({
      id: company.id,
      name: '北極星テック株式会社',
      profile: company.profile,
      stockedQuestions: [kept],
      createdAt: company.createdAt,
      updatedAt: new Date('2026-10-18T00:00:00.000Z'),
    });
    await companies.save(renamed);

    const updated = await companies.findById(company.id);
    assert.ok(updated);
    assert.equal(updated.name, '北極星テック株式会社');
    assert.equal(updated.createdAt.getTime(), createdAt);
    assert.equal(updated.updatedAt.toISOString(), '2026-10-18T00:00:00.000Z');
    assert.equal(updated.stockedQuestions.length, 1);
    assert.equal(updated.stockedQuestions[0].id, kept.id);
    assert.equal(updated.stockedQuestions[0].questionText, kept.questionText);
    assert.equal(await count(db, 'stocked_reverse_questions'), 1);
    assert.equal(await companies.findById(CompanyId.create('missing').getValue()), null);
  });

  test('round-trips an application graph and wipes removed children', async () => {
    const company = sampleCompany();
    await companies.save(company);
    const application = sampleApplication(company.id, company.stockedQuestions[0]);
    const removedSession = application.sessions[0];
    const keptSession = application.sessions[1];

    await applications.save(application);

    const loaded = await applications.findById(application.id);
    assert.ok(loaded);
    assert.equal(loaded.companyId.value, company.id.value);
    assert.equal(loaded.positionDetails.title, 'Staff Platform Engineer');
    assert.equal(loaded.positionDetails.jobDescriptionUrl, 'https://example.com/jobs/staff');
    assert.equal(loaded.positionDetails.expectedSalaryRange.minAmount, 9000000);
    assert.equal(loaded.positionDetails.expectedSalaryRange.maxAmount, 13000000);
    assert.equal(loaded.positionDetails.expectedSalaryRange.currency, 'JPY');
    assert.equal(loaded.positionDetails.desirabilityRating, 5);
    assert.equal(loaded.motivation.whyThisRole, '分散システムの刷新をリードしたい');
    assert.equal(loaded.currentStage.code, 'FIRST_TECHNICAL');
    assert.equal(loaded.status.code, 'IN_PROGRESS');
    assert.equal(loaded.version, 1);
    assert.equal(loaded.createdAt.getTime(), application.createdAt.getTime());
    assert.equal(loaded.sessions.length, 2);
    assert.equal(loaded.domainEvents.length, 0);

    const online = loaded.sessions[0];
    assert.equal(online.id.value, removedSession.id.value);
    assert.equal(online.format.type, 'ONLINE');
    assert.equal(online.format.onlineDetails?.meetingUrl.url, 'https://zoom.us/j/123456789');
    assert.equal(online.format.onlineDetails?.meetingUrl.platform, 'ZOOM');
    assert.equal(online.format.onlineDetails?.meetingPasscode, '998877');
    assert.deepEqual([...online.interviewerNames], ['田中', '佐藤']);
    assert.equal(online.timeWindow.start.toISOString(), removedSession.timeWindow.start.toISOString());
    assert.equal(online.assignedQuestions.length, 1);
    assert.equal(online.assignedQuestions[0].sourceQuestionId, company.stockedQuestions[0].id);
    assert.equal(online.assignedQuestions[0].customizedQuestionText, 'オンコールの当番頻度はどれくらいですか');
    assert.equal(online.assignedQuestions[0].isAsked, true);
    assert.equal(online.assignedQuestions[0].obtainedAnswer, '現在は週1で持ち回りです');
    assert.equal(online.assignedQuestions[0].insightRating, 4);
    assert.equal(online.reflection?.candidatePerformanceRating, 4);
    assert.equal(online.reflection?.concernsOrRedFlags, 'オンコール負荷が読みにくい');
    assert.equal(online.reflection?.recordedAt.toISOString(), '2026-11-02T03:30:00.000Z');
    assert.equal(online.isCompleted, true);

    const inPerson = loaded.sessions[1];
    assert.equal(inPerson.format.type, 'IN_PERSON');
    assert.equal(inPerson.format.inPersonDetails?.locationName, '渋谷オフィス');
    assert.equal(inPerson.format.inPersonDetails?.roomName, '会議室A');
    assert.equal(inPerson.format.inPersonDetails?.estimatedTravelMinutes, 50);
    assert.equal(inPerson.format.travelBufferMinutes, 50);
    assert.equal(inPerson.isCompleted, false);
    assert.equal(inPerson.reflection, undefined);

    const reflectionTodo = loaded.todos.find(
      (todo) =>
        todo.interviewSessionId?.value === online.id.value &&
        todo.taskType.code === 'POST_INTERVIEW_REFLECTION'
    );
    assert.equal(reflectionTodo?.status.code, 'DONE');
    assert.ok(reflectionTodo?.completedAt);
    const custom = loaded.todos.find((todo) => todo.taskType.code === 'CUSTOM_TODO');
    assert.equal(custom?.title, '職務経歴書の最新化');
    assert.equal(custom?.priority.level, 'HIGH');
    assert.equal(custom?.interviewSessionId, undefined);
    assert.equal(custom?.dueDate?.toISOString(), '2026-10-20T00:00:00.000Z');
    assert.equal(loaded.todos.length, application.todos.length);

    const platform = await db.query<{ meeting_platform: string }>(
      'SELECT meeting_platform FROM interview_sessions WHERE id = $1',
      [online.id.value]
    );
    assert.equal(platform.rows[0].meeting_platform, 'ZOOM');

    const keptTodos = application.todos.filter(
      (todo) => todo.interviewSessionId?.value !== removedSession.id.value
    );
    const narrowed = JobApplication.hydrate({
      id: application.id,
      companyId: application.companyId,
      positionDetails: application.positionDetails,
      motivation: application.motivation,
      currentStage: application.currentStage,
      status: application.status,
      sessions: [keptSession],
      todos: keptTodos,
      version: application.version,
      createdAt: application.createdAt,
      updatedAt: new Date('2026-11-03T00:00:00.000Z'),
    });
    await applications.save(narrowed);

    const afterWipe = await applications.findById(application.id);
    assert.ok(afterWipe);
    assert.deepEqual(
      afterWipe.sessions.map((session) => session.id.value),
      [keptSession.id.value]
    );
    assert.equal(afterWipe.sessions[0].assignedQuestions.length, 0);
    assert.equal(afterWipe.todos.length, keptTodos.length);
    assert.equal(
      afterWipe.todos.some((todo) => todo.interviewSessionId?.value === removedSession.id.value),
      false
    );
    assert.equal(await count(db, 'interview_sessions'), 1);
    assert.equal(await count(db, 'assigned_reverse_questions'), 0);
    assert.equal(await count(db, 'preparation_todos'), keptTodos.length);
    assert.equal(await count(db, 'job_applications'), 1);
  });

  test('keeps the assigned snapshot after the stocked master question is removed', async () => {
    const company = sampleCompany();
    await companies.save(company);
    const application = sampleApplication(company.id, company.stockedQuestions[0]);
    await applications.save(application);

    const withoutMaster = TargetCompany.hydrate({
      id: company.id,
      name: company.name,
      profile: company.profile,
      stockedQuestions: [],
      createdAt: company.createdAt,
      updatedAt: new Date(),
    });
    await companies.save(withoutMaster);

    const loaded = await applications.findById(application.id);
    assert.equal(loaded?.sessions[0].assignedQuestions[0].customizedQuestionText, 'オンコールの当番頻度はどれくらいですか');
    assert.equal(loaded?.sessions[0].assignedQuestions[0].sourceQuestionId, company.stockedQuestions[0].id);
    assert.equal((await companies.findById(company.id))?.stockedQuestions.length, 0);
  });

  test('finds applications by company and deletes the aggregate with its children', async () => {
    const first = sampleCompany();
    const second = TargetCompany.hydrate({
      id: CompanyId.create('company-beta').getValue(),
      name: 'ベータラボ',
      profile: first.profile,
      stockedQuestions: [],
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    await companies.save(first);
    await companies.save(second);

    const alpha = sampleApplication(first.id, first.stockedQuestions[0]);
    const beta = JobApplication.create({
      id: ApplicationId.create('app-beta').getValue(),
      companyId: second.id,
      positionDetails: alpha.positionDetails,
      motivation: alpha.motivation,
    }).getValue();
    await applications.save(alpha);
    await applications.save(beta);

    const forFirst = await applications.findByCompanyId(first.id);
    assert.deepEqual(
      forFirst.map((application) => application.id.value),
      [alpha.id.value]
    );
    const all = await applications.findAll();
    assert.equal(all.length, 2);
    assert.deepEqual(
      (await companies.findAll()).map((company) => company.name),
      ['北極星テック', 'ベータラボ']
    );

    await applications.delete(alpha.id);
    assert.equal(await applications.findById(alpha.id), null);
    assert.equal(await count(db, 'interview_sessions'), 0);
    assert.equal(await count(db, 'preparation_todos'), 0);
    assert.equal(await count(db, 'assigned_reverse_questions'), 0);
    assert.equal((await applications.findByCompanyId(second.id)).length, 1);

    await assert.rejects(() => companies.delete(second.id), PersistenceError);
    await applications.delete(beta.id);
    await companies.delete(second.id);
    assert.equal(await companies.findById(second.id), null);
  });

  test('rolls back the aggregate when a later child insert fails', async () => {
    const company = sampleCompany();
    await companies.save(company);
    const application = sampleApplication(company.id, company.stockedQuestions[0]);
    const failing = new PostgresJobApplicationRepository(new FailOnTodoInsert(db));

    await assert.rejects(
      () => failing.save(application),
      /simulated todo insert failure/
    );

    assert.equal(await count(db, 'job_applications'), 0);
    assert.equal(await count(db, 'interview_sessions'), 0);
    assert.equal(await count(db, 'assigned_reverse_questions'), 0);
    assert.equal(await count(db, 'preparation_todos'), 0);
    assert.equal((await companies.findById(company.id))?.name, '北極星テック');
  });

  test('refuses to save an application whose company does not exist', async () => {
    const application = sampleApplication(
      CompanyId.create('missing-company').getValue(),
      sampleCompany().stockedQuestions[0]
    );
    await assert.rejects(() => applications.save(application), PersistenceError);
    assert.equal(await count(db, 'job_applications'), 0);
  });
});

class FailOnTodoInsert implements SqlClient {
  public constructor(private readonly inner: SqlClient) {}

  public query<T extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ) {
    return this.inner.query<T>(text, values);
  }

  public transaction<T>(work: (tx: SqlQuery) => Promise<T>): Promise<T> {
    return this.inner.transaction((tx) =>
      work({
        query: (text, values) => {
          if (text.includes('INSERT INTO preparation_todos')) {
            throw new Error('simulated todo insert failure');
          }
          return tx.query(text, values);
        },
      })
    );
  }

  public close(): Promise<void> {
    return this.inner.close();
  }
}

function sampleCompany(): TargetCompany {
  const business = BusinessModel.create({
    productSummary: '中小企業向けの在庫同期',
    targetAudience: 'B2B_SMB',
    revenueStream: '月額サブスクリプション',
    keyCompetitors: ['南十字', 'オリオン'],
  }).getValue();
  const tech = TechStackProfile.create({
    primaryLanguages: ['TypeScript', 'Go'],
    cloudPlatform: 'GCP',
    architectureHighlights: ['イベント駆動'],
    techBlogUrls: ['https://example.com/blog'],
  }).getValue();
  const profile = CompanyProfile.create({
    businessModel: business,
    techStack: tech,
    overallAttractivenessSummary: '少人数で事業と技術の両方に入れる',
    corporateMission: '現場の在庫を見える化する',
  }).getValue();
  const first = StockedReverseQuestion.create({
    id: 'question-oncall',
    category: 'ORGANIZATION',
    targetRole: 'ENGINEERING_MANAGER',
    questionText: 'オンコール体制を教えてください',
    hypothesisOrIntent: '運用負荷が属人化していないか確かめたい',
  }).getValue();
  const second = StockedReverseQuestion.create({
    id: 'question-stack',
    category: 'TECH_STACK',
    targetRole: 'LEAD_ENGINEER',
    questionText: '直近で返した技術的負債は何ですか',
    hypothesisOrIntent: '改善に時間を割ける文化か確かめたい',
  }).getValue();

  return TargetCompany.hydrate({
    id: CompanyId.create('company-alpha').getValue(),
    name: '北極星テック',
    profile,
    stockedQuestions: [first, second],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function sampleApplication(companyId: CompanyId, stocked: StockedReverseQuestion): JobApplication {
  const salary = SalaryRange.create({ minAmount: 9000000, maxAmount: 13000000, currency: 'JPY' }).getValue();
  const position = PositionDetails.create({
    title: 'Staff Platform Engineer',
    jobDescriptionUrl: 'https://example.com/jobs/staff',
    expectedSalaryRange: salary,
    targetSeniority: 'Staff',
    desirabilityRating: 5,
  }).getValue();
  const motivation = PositionMotivation.create({
    whyThisRole: '分散システムの刷新をリードしたい',
    valueProposition: '決済基盤のDDD移行を牽引した',
    careerGrowthAlignment: 'スタッフとしての技術牽引',
  }).getValue();
  const application = JobApplication.create({
    id: ApplicationId.create('app-alpha').getValue(),
    companyId,
    positionDetails: position,
    motivation,
    initialStageCode: 'FIRST_TECHNICAL',
  }).getValue();

  const createdAt = new Date('2026-10-01T00:00:00.000Z');
  const stable = JobApplication.hydrate({
    id: application.id,
    companyId: application.companyId,
    positionDetails: application.positionDetails,
    motivation: application.motivation,
    currentStage: application.currentStage,
    status: application.status,
    sessions: [],
    todos: [],
    version: application.version,
    createdAt,
    updatedAt: createdAt,
  });

  const online = InterviewFormat.createOnline(
    MeetingUrl.create('https://zoom.us/j/123456789').getValue(),
    '998877',
    '待機室あり'
  ).getValue();
  const firstWindow = TimeWindow.create(
    '2026-11-02T01:00:00.000Z',
    '2026-11-02T02:00:00.000Z'
  ).getValue();
  const first = stable
    .scheduleInterview({
      timeWindow: firstWindow,
      format: online,
      interviewerNames: ['田中', '佐藤'],
    })
    .getValue();
  stable.assignStockedQuestion(first.id, stocked, 'オンコールの当番頻度はどれくらいですか');
  stable.recordQuestionAnswer(first.id, first.assignedQuestions[0].id, '現在は週1で持ち回りです', 4);
  stable.recordInterviewReflection(
    first.id,
    InterviewReflection.create({
      candidatePerformanceRating: 4,
      companyImpressionRating: 3,
      keyLearningsAndInsights: 'オンコールは週次の持ち回りで、専任チームはまだない',
      concernsOrRedFlags: 'オンコール負荷が読みにくい',
      nextActionNotes: '二次面接で体制図を確認する',
      recordedAt: new Date('2026-11-02T03:30:00.000Z'),
    }).getValue()
  );

  const inPerson = InterviewFormat.createInPerson(
    '渋谷オフィス',
    '会議室A',
    '1F受付で呼び出し',
    50
  ).getValue();
  stable.scheduleInterview({
    stage: SelectionStage.create('FINAL_EXECUTIVE').getValue(),
    timeWindow: TimeWindow.create('2026-11-20T05:00:00.000Z', '2026-11-20T06:00:00.000Z').getValue(),
    format: inPerson,
    interviewerNames: ['役員'],
  });
  stable.addCustomTodo({
    title: '職務経歴書の最新化',
    priority: TaskPriority.high(),
    dueDate: new Date('2026-10-20T00:00:00.000Z'),
  });

  return stable;
}

async function count(db: SqlClient, table: string): Promise<number> {
  const result = await db.query<{ count: number | string }>(
    `SELECT COUNT(*)::int AS count FROM ${table}`
  );
  return Number(result.rows[0].count);
}
