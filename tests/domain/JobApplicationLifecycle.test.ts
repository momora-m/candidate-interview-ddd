import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JobApplication } from '../../src/domain/application/JobApplication';
import { CompanyId } from '../../src/domain/company/CompanyId';
import { PositionDetails } from '../../src/domain/application/PositionDetails';
import { SalaryRange } from '../../src/domain/application/SalaryRange';
import { PositionMotivation } from '../../src/domain/application/PositionMotivation';
import { TimeWindow } from '../../src/domain/interview/TimeWindow';
import { InterviewFormat } from '../../src/domain/interview/InterviewFormat';
import { MeetingUrl } from '../../src/domain/interview/MeetingUrl';
import { InterviewReflection } from '../../src/domain/interview/InterviewReflection';
import { TaskStatus } from '../../src/domain/todo/TaskStatus';

describe('JobApplication Lifecycle & Automatic Task Generation', () => {
  test('scheduling an interview session automatically generates candidate preparation & follow-up TODOs', () => {
    const salary = SalaryRange.create({ minAmount: 9000000, maxAmount: 13000000 }).getValue();
    const posDetails = PositionDetails.create({
      title: 'Staff Platform Engineer',
      expectedSalaryRange: salary,
      desirabilityRating: 5,
    }).getValue();

    const motivation = PositionMotivation.create({
      whyThisRole: 'Go/Rustによる分散システム基盤の刷新をリードしたい',
      valueProposition: '過去3年間で大規模決済基盤のDDD移行を牽引した経験',
      careerGrowthAlignment: 'スタッフエンジニアとしての組織的技術牽引',
    }).getValue();

    const appRes = JobApplication.create({
      companyId: CompanyId.create('comp_123').getValue(),
      positionDetails: posDetails,
      motivation,
      initialStageCode: 'FIRST_TECHNICAL',
    });
    assert.ok(appRes.isSuccess());
    const app = appRes.getValue();

    assert.equal(app.currentStage.code, 'FIRST_TECHNICAL');
    assert.equal(app.todos.length, 0);

    // Schedule First Technical Interview
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const timeWindow = TimeWindow.create(startTime, endTime).getValue();
    const format = InterviewFormat.createOnline(
      MeetingUrl.create('https://zoom.us/j/1234567890').getValue(),
      'pass-888'
    ).getValue();

    const schedRes = app.scheduleInterview({
      timeWindow,
      format,
      interviewerNames: ['テックリード 田中', 'シニアエンジニア 鈴木'],
    });
    assert.ok(schedRes.isSuccess());
    const session = schedRes.getValue();

    // Verify automatically generated tasks
    assert.equal(app.sessions.length, 1);
    assert.equal(app.todos.length, 6);

    const taskTypes = app.todos.map((t) => t.taskType.code);
    assert.ok(taskTypes.includes('PRE_INTERVIEW_RESEARCH'));
    assert.ok(taskTypes.includes('REVERSE_QUESTION_PREP'));
    assert.ok(taskTypes.includes('RESUME_PORTFOLIO_REVIEW'));
    assert.ok(taskTypes.includes('ATTEND_INTERVIEW'));
    assert.ok(taskTypes.includes('POST_INTERVIEW_REFLECTION'));
    assert.ok(taskTypes.includes('THANK_YOU_NOTE'));

    // Record reflection
    const reflection = InterviewReflection.create({
      candidatePerformanceRating: 4,
      companyImpressionRating: 5,
      keyLearningsAndInsights: 'マイクロサービス間のイベントバス基盤について非常に深くディスカッションできた。カルチャーも素晴らしい。',
      nextActionNotes: '次回EM面接に向けて組織マネジメント方針を質問項目として準備する',
    }).getValue();

    const refRes = app.recordInterviewReflection(session.id, reflection);
    assert.ok(refRes.isSuccess());

    // Auto-completion of ATTEND_INTERVIEW and POST_INTERVIEW_REFLECTION tasks
    const attendTask = app.todos.find((t) => t.taskType.code === 'ATTEND_INTERVIEW');
    const reflectionTask = app.todos.find((t) => t.taskType.code === 'POST_INTERVIEW_REFLECTION');
    assert.equal(attendTask?.status.isDone, true);
    assert.equal(reflectionTask?.status.isDone, true);

    // Now advance pipeline to next stage (SECOND_MANAGEMENT)
    const advanceRes = app.advanceStage();
    assert.ok(advanceRes.isSuccess());
    assert.equal(app.currentStage.code, 'SECOND_MANAGEMENT');
  });

  test('cannot advance pipeline if interview reflection is missing', () => {
    const posDetails = PositionDetails.create({
      title: 'Backend Engineer',
    }).getValue();

    const app = JobApplication.create({
      companyId: CompanyId.create('comp_456').getValue(),
      positionDetails: posDetails,
      initialStageCode: 'CASUAL_INTERVIEW',
    }).getValue();

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    app.scheduleInterview({
      timeWindow: TimeWindow.create(startTime, endTime).getValue(),
      format: InterviewFormat.createOnline(
        MeetingUrl.create('https://meet.google.com/abc-defg-hij').getValue()
      ).getValue(),
    });

    // Attempt to advance stage without reflection
    const advanceRes = app.advanceStage();
    assert.equal(advanceRes.isFailure(), true);
    assert.match(advanceRes.getError(), /面接振り返り（Reflection）が未入力です/);
  });
});
