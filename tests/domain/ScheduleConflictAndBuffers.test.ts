import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CandidateScheduleConflictDomainService } from '../../src/domain/services/CandidateScheduleConflictDomainService';
import { JobApplication } from '../../src/domain/application/JobApplication';
import { CompanyId } from '../../src/domain/company/CompanyId';
import { PositionDetails } from '../../src/domain/application/PositionDetails';
import { TimeWindow } from '../../src/domain/interview/TimeWindow';
import { InterviewFormat } from '../../src/domain/interview/InterviewFormat';
import { MeetingUrl } from '../../src/domain/interview/MeetingUrl';

describe('CandidateScheduleConflictDomainService & Travel Buffers', () => {
  const service = new CandidateScheduleConflictDomainService();

  test('detects direct hard collision between two interview sessions', () => {
    // Existing App 1 with online interview at 14:00 - 15:00
    const app1 = JobApplication.create({
      companyId: CompanyId.create('comp_1').getValue(),
      positionDetails: PositionDetails.create({ title: 'Lead Engineer' }).getValue(),
    }).getValue();

    const baseDate = new Date('2026-11-10T14:00:00.000Z');
    const existingStart = new Date(baseDate);
    const existingEnd = new Date(baseDate.getTime() + 60 * 60 * 1000); // 14:00 - 15:00

    app1.scheduleInterview({
      timeWindow: TimeWindow.create(existingStart, existingEnd).getValue(),
      format: InterviewFormat.createOnline(
        MeetingUrl.create('https://zoom.us/j/111').getValue()
      ).getValue(),
    });

    // Try to schedule App 2 at 14:30 - 15:30 (Direct Overlap)
    const newStart = new Date(baseDate.getTime() + 30 * 60 * 1000);
    const newEnd = new Date(baseDate.getTime() + 90 * 60 * 1000);
    const newWindow = TimeWindow.create(newStart, newEnd).getValue();
    const newFormat = InterviewFormat.createOnline(
      MeetingUrl.create('https://meet.google.com/222').getValue()
    ).getValue();

    const conflictRes = service.checkConflicts(newWindow, newFormat, [app1]);
    assert.equal(conflictRes.isFailure(), true);
    assert.equal(conflictRes.getError().isHardOverlap, true);
    assert.match(conflictRes.getError().overlapReason, /直接重複しています/);
  });

  test('detects travel buffer collision between in-person interview and subsequent online interview', () => {
    // App 1: In-person interview in Shibuya from 13:00 - 14:00 with 45 min travel buffer
    const app1 = JobApplication.create({
      companyId: CompanyId.create('comp_1').getValue(),
      positionDetails: PositionDetails.create({ title: 'Architect' }).getValue(),
    }).getValue();

    const baseDate = new Date('2026-11-10T13:00:00.000Z');
    const inPersonStart = new Date(baseDate);
    const inPersonEnd = new Date(baseDate.getTime() + 60 * 60 * 1000); // 13:00 - 14:00

    app1.scheduleInterview({
      timeWindow: TimeWindow.create(inPersonStart, inPersonEnd).getValue(),
      format: InterviewFormat.createInPerson('渋谷ストリーム', '8F 会議室', undefined, 45).getValue(),
    });

    // App 2: Online interview starting at 14:15 (No direct overlap, but 15 min gap is not enough for 45 min travel!)
    const onlineStart = new Date(baseDate.getTime() + 75 * 60 * 1000); // 14:15
    const onlineEnd = new Date(baseDate.getTime() + 135 * 60 * 1000); // 15:15

    const onlineWindow = TimeWindow.create(onlineStart, onlineEnd).getValue();
    const onlineFormat = InterviewFormat.createOnline(
      MeetingUrl.create('https://zoom.us/j/333').getValue()
    ).getValue();

    const conflictRes = service.checkConflicts(onlineWindow, onlineFormat, [app1]);
    assert.equal(conflictRes.isFailure(), true);
    assert.equal(conflictRes.getError().isHardOverlap, false);
    assert.match(conflictRes.getError().overlapReason, /移動・準備バッファ/);
  });
});
