import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { StockedReverseQuestion } from '../../src/domain/company/StockedReverseQuestion';
import { applySchema } from '../../src/infrastructure/persistence/applySchema';
import { PostgresJobApplicationRepository } from '../../src/infrastructure/persistence/repositories/PostgresJobApplicationRepository';
import { PostgresTargetCompanyRepository } from '../../src/infrastructure/persistence/repositories/PostgresTargetCompanyRepository';
import { PostgresDomainEventDispatchLog } from '../../src/infrastructure/persistence/outbox/domainEvents';
import { PostgresCandidateReadModel } from '../../src/infrastructure/read-model/PostgresCandidateReadModel';
import { wireCandidateRuntime } from '../../src/infrastructure/createCandidateRuntime';
import { PgliteDatabase } from '../infrastructure/PgliteDatabase';

describe('In-process CQRS outbox', () => {
  test('projects the read model after commit and can replay an undispatched event', async () => {
    const db = await PgliteDatabase.create();
    await applySchema(db);
    const companies = new PostgresTargetCompanyRepository(db);
    const applications = new PostgresJobApplicationRepository(db);
    const runtime = wireCandidateRuntime({
      persistence: 'postgres',
      companies,
      applications,
      readModel: new PostgresCandidateReadModel(db),
      dispatchLog: new PostgresDomainEventDispatchLog(db),
    });

    const created = await runtime.useCases.createTargetCompany.execute({
      name: '北極星テック',
      productSummary: '在庫同期',
      targetAudience: 'B2B_SMB',
      revenueStream: '月額',
      primaryLanguages: ['TypeScript'],
      cloudPlatform: 'GCP',
    });
    assert.ok(created.isSuccess());
    const company = created.getValue();

    const projected = await runtime.queries.getCompany(company.id.value);
    assert.equal(projected?.name, '北極星テック');
    assert.equal(projected?.stockedQuestions.length, 0);

    const dispatched = await db.query<{ dispatched_at: Date | null }>(
      'SELECT dispatched_at FROM domain_events'
    );
    assert.equal(dispatched.rows.length, 1);
    assert.ok(dispatched.rows[0].dispatched_at);

    const question = StockedReverseQuestion.create({
      category: 'CULTURE',
      targetRole: 'LEAD_ENGINEER',
      questionText: 'オンコールは当番制ですか',
      hypothesisOrIntent: '運用負荷を知りたい',
    }).getValue();
    const added = company.addStockedQuestion(question);
    assert.ok(added.isSuccess());
    await companies.save(company);

    const beforeReplay = await runtime.queries.getCompany(company.id.value);
    assert.equal(beforeReplay?.stockedQuestions.length, 0);

    await runtime.dispatchPending();

    const afterReplay = await runtime.queries.getCompany(company.id.value);
    assert.equal(afterReplay?.stockedQuestions.length, 1);
    assert.equal(afterReplay?.stockedQuestions[0].questionText, 'オンコールは当番制ですか');
    const events = await runtime.queries.listEvents();
    assert.ok(events.some((event) => event.eventType === 'STOCKED_REVERSE_QUESTION_ADDED'));
    const pending = await db.query<{ count: number | string }>(
      'SELECT COUNT(*)::int AS count FROM domain_events WHERE dispatched_at IS NULL'
    );
    assert.equal(Number(pending.rows[0].count), 0);

    const application = await runtime.useCases.createJobApplication.execute({
      companyId: company.id.value,
      positionTitle: 'Staff Platform Engineer',
      desirabilityRating: 4,
      initialStageCode: 'FIRST_TECHNICAL',
    });
    assert.ok(application.isSuccess());
    const listed = await runtime.queries.listApplications();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].companyName, '北極星テック');
    assert.equal(listed[0].positionTitle, 'Staff Platform Engineer');
    await db.close();
  });
});
