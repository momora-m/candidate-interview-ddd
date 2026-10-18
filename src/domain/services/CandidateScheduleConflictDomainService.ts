import { JobApplication } from '../application/JobApplication';
import { InterviewFormat } from '../interview/InterviewFormat';
import { InterviewSessionId } from '../interview/InterviewSessionId';
import { ProposedScheduleId } from '../interview/ProposedScheduleId';
import { TimeWindow } from '../interview/TimeWindow';
import { Result } from '../shared/Result';

export type ScheduleOccupancyKind = 'CONFIRMED_SESSION' | 'PENDING_PROPOSAL';

export interface ScheduleConflictDetail {
  conflictingApplicationId: string;
  conflictingSessionId: string;
  conflictingStageName: string;
  conflictingTimeWindowJP: string;
  conflictingFormatSummary: string;
  overlapReason: string;
  isHardOverlap: boolean;
  occupancyKind: ScheduleOccupancyKind;
}

export class CandidateScheduleConflictDomainService {
  /**
   * A candidate cannot offer or confirm a window that collides with another
   * confirmed session, including travel buffers, or with a slot already
   * submitted to another company and still awaiting a reply.
   */
  public checkConflicts(
    targetTimeWindow: TimeWindow,
    targetFormat: InterviewFormat,
    applications: JobApplication[],
    ignoreSessionId?: InterviewSessionId,
    ignoreProposalId?: ProposedScheduleId
  ): Result<void, ScheduleConflictDetail> {
    const targetBuffer = targetFormat.travelBufferMinutes;

    for (const app of applications) {
      if (app.status.isTerminal) {
        continue;
      }

      for (const session of app.sessions) {
        if (ignoreSessionId && session.id.equals(ignoreSessionId)) {
          continue;
        }

        const sessionConflict = this.compareWindow(
          targetTimeWindow,
          targetBuffer,
          session.timeWindow,
          session.format.travelBufferMinutes,
          {
            applicationId: app.id.value,
            ownerId: session.id.value,
            stageName: session.stage.label,
            timeWindowJP: session.timeWindow.formatJP(),
            formatSummary: session.format.getDisplaySummary(),
            occupancyKind: 'CONFIRMED_SESSION',
          }
        );
        if (sessionConflict) {
          return Result.fail(sessionConflict);
        }
      }

      for (const proposal of app.proposedSchedules) {
        if (!proposal.occupiesCalendar()) {
          continue;
        }
        if (ignoreProposalId && proposal.id.equals(ignoreProposalId)) {
          continue;
        }

        for (const slot of proposal.slots) {
          const proposalConflict = this.compareWindow(
            targetTimeWindow,
            targetBuffer,
            slot,
            proposal.format.travelBufferMinutes,
            {
              applicationId: app.id.value,
              ownerId: proposal.id.value,
              stageName: proposal.stage.label,
              timeWindowJP: slot.formatJP(),
              formatSummary: proposal.format.getDisplaySummary(),
              occupancyKind: 'PENDING_PROPOSAL',
            }
          );
          if (proposalConflict) {
            return Result.fail(proposalConflict);
          }
        }
      }
    }

    return Result.ok(undefined);
  }

  private compareWindow(
    target: TimeWindow,
    targetBuffer: number,
    existing: TimeWindow,
    existingBuffer: number,
    owner: {
      applicationId: string;
      ownerId: string;
      stageName: string;
      timeWindowJP: string;
      formatSummary: string;
      occupancyKind: ScheduleOccupancyKind;
    }
  ): ScheduleConflictDetail | null {
    const direct = target.overlapsWith(existing);
    const buffered = target.overlapsWithBuffers(existing, targetBuffer, existingBuffer);
    if (!direct && !buffered) {
      return null;
    }

    const isProposal = owner.occupancyKind === 'PENDING_PROPOSAL';
    const overlapReason = direct
      ? isProposal
        ? `他社または別選考へ提示中の候補日（${owner.stageName}: ${owner.timeWindowJP}）と時間帯が重複しています。同じ時間を複数の日程調整に出すことはできません。`
        : `既に他社/別選考の面接（${owner.stageName}: ${owner.timeWindowJP}）と時間帯が直接重複しています。`
      : isProposal
        ? `提示中の候補日（${owner.stageName}: ${owner.timeWindowJP}）とは時間は重なりませんが、移動・準備バッファ（予定A: ${targetBuffer}分 / 提示中: ${existingBuffer}分）を考慮すると両方を確定できません。`
        : `面接自体の時間は重複していませんが、移動・準備バッファ（予定A: ${targetBuffer}分 / 既存: ${existingBuffer}分）を考慮すると移動が間に合わない過密スケジュールです。`;

    return {
      conflictingApplicationId: owner.applicationId,
      conflictingSessionId: owner.ownerId,
      conflictingStageName: owner.stageName,
      conflictingTimeWindowJP: owner.timeWindowJP,
      conflictingFormatSummary: owner.formatSummary,
      overlapReason,
      isHardOverlap: direct,
      occupancyKind: owner.occupancyKind,
    };
  }
}
