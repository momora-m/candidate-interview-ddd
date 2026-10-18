import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CandidateAppContainer } from '../../src/infrastructure/container';

describe('Application Layer Use Cases & Workflows', () => {
  let app: CandidateAppContainer;

  beforeEach(async () => {
    app = new CandidateAppContainer();
    await app.init();
  });

  test('creates a new target company with business model and tech stack', async () => {
    const res = await app.createTargetCompany.execute({
      name: 'テスト株式会社',
      productSummary: 'AI開発支援SaaS',
      targetAudience: 'B2B_ENTERPRISE',
      revenueStream: 'SaaSサブスクリプション',
      primaryLanguages: ['TypeScript', 'Python'],
      cloudPlatform: 'GCP',
    });

    assert.ok(res.isSuccess());
    const company = res.getValue();
    assert.equal(company.name, 'テスト株式会社');

    const found = await app.companyRepo.findById(company.id);
    assert.ok(found);
    assert.equal(found?.name, 'テスト株式会社');
  });

  test('creates a job application, schedules interview, assigns question, records answer & reflection, and advances stage', async () => {
    const dashboard = await app.getDashboardData();
    const comp = dashboard.companies[0];
    assert.ok(comp);

    // 1. Create Job Application
    const appRes = await app.createJobApplication.execute({
      companyId: comp.id,
      positionTitle: 'Lead Software Engineer',
      salaryMin: 10000000,
      salaryMax: 13000000,
      desirabilityRating: 5,
      whyThisRole: 'アーキテクチャ刷新の牽引',
      initialStageCode: 'CASUAL_INTERVIEW',
    });
    assert.ok(appRes.isSuccess());
    const createdApp = appRes.getValue();

    // 2. Schedule Interview (tomorrow)
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const schedRes = await app.scheduleInterview.execute({
      applicationId: createdApp.id.value,
      startTime,
      endTime,
      formatType: 'ONLINE',
      meetingUrl: 'https://zoom.us/j/999888777',
      interviewerNames: ['テックリード 高橋'],
    });
    assert.ok(schedRes.isSuccess());
    const sessionId = schedRes.getValue().sessionId;

    // 3. Assign Stocked Question
    const stockedQ = comp.stockedQuestions[0];
    assert.ok(stockedQ);
    const assignRes = await app.assignReverseQuestion.execute({
      applicationId: createdApp.id.value,
      sessionId,
      stockedQuestionId: stockedQ.id,
      customizedText: '高橋さんのチームでは、どのようにSagaパターンを採用していますか？',
    });
    assert.ok(assignRes.isSuccess());

    // 4. Record Answer
    const updatedApp = (await app.applicationRepo.findById(createdApp.id))!;
    const assignedQ = updatedApp.sessions[0].assignedQuestions[0];
    assert.ok(assignedQ);

    const ansRes = await app.recordQuestionAnswer.execute({
      applicationId: createdApp.id.value,
      sessionId,
      questionId: assignedQ.id,
      answer: 'オーケストレーション型SagaをTemporal上で運用しており、冪等性も担保しています。',
      insightRating: 5,
    });
    assert.ok(ansRes.isSuccess());

    // 5. Record Interview Reflection
    const refRes = await app.recordInterviewReflection.execute({
      applicationId: createdApp.id.value,
      sessionId,
      candidatePerformanceRating: 5,
      companyImpressionRating: 5,
      keyLearningsAndInsights: '技術選定とチーム文化が非常にマッチしている。',
      nextActionNotes: '一次技術面接に向けてコーディングテスト対策を進める。',
    });
    assert.ok(refRes.isSuccess());

    // 6. The candidate, not the company, decides to enter formal selection.
    const advRes = await app.decideAfterCasualInterview.execute({
      applicationId: createdApp.id.value,
      decision: 'PROCEED',
    });
    assert.ok(advRes.isSuccess());
    assert.equal(advRes.getValue().nextStageName, '一次技術面接 / スキル評価');

    // 7. Verify Domain Events in EventBus
    const events = app.eventBus.getHistory();
    const eventTypes = events.map((e) => e.eventType);
    assert.ok(eventTypes.includes('INTERVIEW_SESSION_SCHEDULED'));
    assert.ok(eventTypes.includes('REVERSE_QUESTION_ASSIGNED'));
    assert.ok(eventTypes.includes('REVERSE_QUESTION_ANSWER_RECORDED'));
    assert.ok(eventTypes.includes('INTERVIEW_REFLECTION_RECORDED'));
    assert.ok(eventTypes.includes('SELECTION_STAGE_ADVANCED'));
    assert.ok(eventTypes.includes('CASUAL_INTERVIEW_DECISION_MADE'));
  });

  test('toggles todo status and adds custom todo', async () => {
    const dashboard = await app.getDashboardData();
    const targetApp = dashboard.applications[0];
    assert.ok(targetApp);
    const todo = targetApp.todos[0];
    assert.ok(todo);

    const toggleRes = await app.toggleTodoStatus.execute({
      applicationId: targetApp.id,
      todoId: todo.id,
    });
    assert.ok(toggleRes.isSuccess());

    const customRes = await app.addCustomTodo.execute({
      applicationId: targetApp.id,
      title: '技術ブログの第3章を熟読する',
      priorityLevel: 'HIGH',
    });
    assert.ok(customRes.isSuccess());
  });
});
