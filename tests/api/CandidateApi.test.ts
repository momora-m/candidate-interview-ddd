import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createCandidateUseCases } from '../../src/application/createCandidateUseCases';
import { CandidateQueryService } from '../../src/application/queries/CandidateQueryService';
import { createApp } from '../../src/api/app';
import { InMemoryEventBus } from '../../src/infrastructure/event-bus/InMemoryEventBus';
import { InMemoryJobApplicationRepository } from '../../src/infrastructure/repositories/InMemoryJobApplicationRepository';
import { InMemoryTargetCompanyRepository } from '../../src/infrastructure/repositories/InMemoryTargetCompanyRepository';

function testApp() {
  const companyRepo = new InMemoryTargetCompanyRepository();
  const applicationRepo = new InMemoryJobApplicationRepository();
  const eventBus = new InMemoryEventBus();
  return createApp({
    persistence: 'memory',
    queries: new CandidateQueryService(companyRepo, applicationRepo, eventBus),
    useCases: createCandidateUseCases(companyRepo, applicationRepo, eventBus),
  });
}

async function postJson(app: ReturnType<typeof testApp>, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Hono candidate API', () => {
  test('schedules an interview through the use case and rejects a buffered collision', async () => {
    const app = testApp();

    const companyResponse = await postJson(app, '/api/companies', {
      name: '北極星テック',
      productSummary: '在庫同期',
      targetAudience: 'B2B_SMB',
      revenueStream: '月額サブスクリプション',
      primaryLanguages: ['TypeScript'],
      cloudPlatform: 'GCP',
    });
    assert.equal(companyResponse.status, 201);
    const company = await companyResponse.json();
    assert.equal(company.name, '北極星テック');

    const questionResponse = await postJson(app, `/api/companies/${company.id}/questions`, {
      category: 'ORGANIZATION',
      targetRole: 'ENGINEERING_MANAGER',
      questionText: 'オンコール体制を教えてください',
      hypothesisOrIntent: '運用負荷が属人化していないか確かめたい',
    });
    assert.equal(questionResponse.status, 201);
    const question = await questionResponse.json();

    const applicationResponse = await postJson(app, '/api/applications', {
      companyId: company.id,
      positionTitle: 'Staff Platform Engineer',
      salaryMin: 9000000,
      salaryMax: 13000000,
      desirabilityRating: 5,
      whyThisRole: '分散システムの刷新をリードしたい',
      initialStageCode: 'FIRST_TECHNICAL',
    });
    assert.equal(applicationResponse.status, 201);
    const created = await applicationResponse.json();

    const interviewResponse = await postJson(app, `/api/applications/${created.id}/interviews`, {
      startTime: '2026-12-01T01:00:00.000Z',
      endTime: '2026-12-01T02:00:00.000Z',
      formatType: 'IN_PERSON',
      locationName: '渋谷オフィス',
      roomName: '会議室A',
      estimatedTravelMinutes: 45,
      interviewerNames: ['田中'],
    });
    assert.equal(interviewResponse.status, 201);
    const scheduled = await interviewResponse.json();
    assert.equal(scheduled.application.sessions.length, 1);
    assert.equal(scheduled.application.todos.length, 6);
    assert.equal(scheduled.application.companyName, '北極星テック');

    const assignResponse = await postJson(
      app,
      `/api/applications/${created.id}/interviews/${scheduled.sessionId}/questions`,
      {
        stockedQuestionId: question.questionId,
        customizedText: 'オンコールの当番頻度はどれくらいですか',
      }
    );
    assert.equal(assignResponse.status, 200);
    const assigned = await assignResponse.json();
    assert.equal(assigned.sessions[0].assignedQuestions[0].customizedQuestionText, 'オンコールの当番頻度はどれくらいですか');

    const collision = await postJson(app, `/api/applications/${created.id}/interviews`, {
      startTime: '2026-12-01T02:20:00.000Z',
      endTime: '2026-12-01T03:00:00.000Z',
      formatType: 'ONLINE',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
    });
    assert.equal(collision.status, 409);
    const collisionBody = await collision.json();
    assert.match(collisionBody.error, /重複/);

    const blocked = await app.request(`/api/applications/${created.id}/advance`, { method: 'POST' });
    assert.equal(blocked.status, 400);
    const blockedBody = await blocked.json();
    assert.match(blockedBody.error, /振り返り/);

    const events = await app.request('/api/events');
    assert.equal(events.status, 200);
    const eventBody = await events.json();
    assert.ok(eventBody.some((event: { eventType: string }) => event.eventType.includes('Scheduled') || event.eventType.length > 0));
  });

  test('refuses to propose a slot that overlaps a confirmed casual interview and can confirm another slot', async () => {
    const app = testApp();
    const companyResponse = await postJson(app, '/api/companies', {
      name: '南十字テック',
      productSummary: '物流最適化',
      targetAudience: 'B2B_SMB',
      revenueStream: '従量課金',
      primaryLanguages: ['Go'],
    });
    const company = await companyResponse.json();
    const casualResponse = await postJson(app, '/api/applications', {
      companyId: company.id,
      initialStageCode: 'CASUAL_INTERVIEW',
    });
    assert.equal(casualResponse.status, 201);
    const casual = await casualResponse.json();
    assert.equal(casual.positionTitle, 'ポジション未定');

    const proposed = await postJson(app, `/api/applications/${casual.id}/proposed-schedules`, {
      slots: [
        { startTime: '2026-12-10T01:00:00.000Z', endTime: '2026-12-10T02:00:00.000Z' },
        { startTime: '2026-12-11T01:00:00.000Z', endTime: '2026-12-11T02:00:00.000Z' },
      ],
      formatType: 'ONLINE',
      meetingUrl: 'https://meet.google.com/south-cross',
      note: 'カジュアル面談の候補',
    });
    assert.equal(proposed.status, 201);
    const proposal = await proposed.json();

    const otherCompany = await postJson(app, '/api/companies', {
      name: '東雲ラボ',
      productSummary: '実験基盤',
      targetAudience: 'B2C',
      revenueStream: '広告',
      primaryLanguages: ['TypeScript'],
    });
    const other = await otherCompany.json();
    const otherApplication = await postJson(app, '/api/applications', {
      companyId: other.id,
      positionTitle: 'Product Engineer',
      initialStageCode: 'FIRST_TECHNICAL',
    });
    const otherApp = await otherApplication.json();
    const blocked = await postJson(app, `/api/applications/${otherApp.id}/proposed-schedules`, {
      slots: [{ startTime: '2026-12-10T01:15:00.000Z', endTime: '2026-12-10T02:00:00.000Z' }],
      formatType: 'ONLINE',
    });
    assert.equal(blocked.status, 409);

    const confirmed = await postJson(
      app,
      `/api/applications/${casual.id}/proposed-schedules/${proposal.proposalId}/confirm`,
      { slotIndex: 0 }
    );
    assert.equal(confirmed.status, 200);
    const confirmedBody = await confirmed.json();
    assert.equal(confirmedBody.application.sessions[0].stageCode, 'CASUAL_INTERVIEW');
    assert.equal(confirmedBody.application.proposedSchedules[0].statusCode, 'CONFIRMED');

    const decision = await postJson(app, `/api/applications/${casual.id}/casual-decision`, {
      decision: 'PROCEED',
    });
    assert.equal(decision.status, 400);
    assert.match((await decision.json()).error, /振り返り/);
  });

  test('rejects a malformed company payload before it reaches the domain', async () => {
    const app = testApp();
    const response = await postJson(app, '/api/companies', { name: '' });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'リクエストの形式が正しくありません。');
    assert.ok(body.issues.length > 0);

    const missing = await app.request('/api/applications/missing-application');
    assert.equal(missing.status, 404);

    const openapi = await app.request('/openapi.yaml');
    assert.equal(openapi.status, 200);
    assert.match(await openapi.text(), /openapi: 3\.1\.0/);

    const docs = await app.request('/docs');
    assert.equal(docs.status, 200);
    assert.match(await docs.text(), /SwaggerUI/);
  });
});