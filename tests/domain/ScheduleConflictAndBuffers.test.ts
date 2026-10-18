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

  test('blocks a candidate slot that overlaps another company pending proposal, including a casual interview', () => {
    const casual = JobApplication.create({
      companyId: CompanyId.create('comp_casual').getValue(),
      positionDetails: PositionDetails.create({ title: 'ポジション未定' }).getValue(),
      initialStageCode: 'CASUAL_INTERVIEW',
    }).getValue();
    const held = TimeWindow.create('2026-11-12T01:00:00.000Z', '2026-11-12T02:00:00.000Z').getValue();
    const alternate = TimeWindow.create('2026-11-13T01:00:00.000Z', '2026-11-13T02:00:00.000Z').getValue();
    const format = InterviewFormat.createOnline(
      MeetingUrl.create('https://meet.google.com/casual').getValue()
    ).getValue();
    assert.ok(
      casual.proposeSchedule({
        slots: [held, alternate],
        format,
        note: 'カジュアル面談の候補',
      }).isSuccess()
    );

    const other = JobApplication.create({
      companyId: CompanyId.create('comp_other').getValue(),
      positionDetails: PositionDetails.create({ title: 'Backend' }).getValue(),
      initialStageCode: 'FIRST_TECHNICAL',
    }).getValue();
    const overlapping = TimeWindow.create('2026-11-12T01:30:00.000Z', '2026-11-12T02:30:00.000Z').getValue();
    const conflict = service.checkConflicts(overlapping, format, [casual, other]);
    assert.equal(conflict.isFailure(), true);
    assert.equal(conflict.getError().occupancyKind, 'PENDING_PROPOSAL');
    assert.equal(conflict.getError().isHardOverlap, true);

    const confirmed = casual.confirmProposedSchedule(casual.proposedSchedules[0].id, 0);
    assert.ok(confirmed.isSuccess());
    assert.equal(confirmed.getValue().stage.code, 'CASUAL_INTERVIEW');
    const released = service.checkConflicts(overlapping, format, [casual]);
    assert.equal(released.isFailure(), true);
    assert.equal(released.getError().occupancyKind, 'CONFIRMED_SESSION');

    const freedAlternate = service.checkConflicts(alternate, format, [casual], undefined, casual.proposedSchedules[0].id);
    assert.equal(freedAlternate.isSuccess(), true);
  });
});
