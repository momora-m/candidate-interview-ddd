import { JobApplication } from '../application/JobApplication';
import { TimeWindow } from '../interview/TimeWindow';
import { InterviewFormat } from '../interview/InterviewFormat';
import { InterviewSessionId } from '../interview/InterviewSessionId';
import { Result } from '../shared/Result';

export interface ScheduleConflictDetail {
  conflictingApplicationId: string;
  conflictingSessionId: string;
  conflictingStageName: string;
  conflictingTimeWindowJP: string;
  conflictingFormatSummary: string;
  overlapReason: string;
  isHardOverlap: boolean; // Direct time collision vs travel buffer collision
}

export class CandidateScheduleConflictDomainService {
  /**
   * Checks if scheduling an interview time slot creates a direct collision or travel buffer
   * collision with any other existing interview session across all active job applications.
   */
  public checkConflicts(
    targetTimeWindow: TimeWindow,
    targetFormat: InterviewFormat,
    applications: JobApplication[],
    ignoreSessionId?: InterviewSessionId
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

        const existingWindow = session.timeWindow;
        const existingBuffer = session.format.travelBufferMinutes;

        // 1. Direct collision check (without buffers)
        if (targetTimeWindow.overlapsWith(existingWindow)) {
          return Result.fail({
            conflictingApplicationId: app.id.value,
            conflictingSessionId: session.id.value,
            conflictingStageName: session.stage.label,
            conflictingTimeWindowJP: existingWindow.formatJP(),
            conflictingFormatSummary: session.format.getDisplaySummary(),
            overlapReason: `既に他社/別選考の面接（${session.stage.label}: ${existingWindow.formatJP()}）と時間帯が直接重複しています。`,
            isHardOverlap: true,
          });
        }

        // 2. Buffer collision check (travel/preparation time)
        if (targetTimeWindow.overlapsWithBuffers(existingWindow, targetBuffer, existingBuffer)) {
          return Result.fail({
            conflictingApplicationId: app.id.value,
            conflictingSessionId: session.id.value,
            conflictingStageName: session.stage.label,
            conflictingTimeWindowJP: existingWindow.formatJP(),
            conflictingFormatSummary: session.format.getDisplaySummary(),
            overlapReason: `面接自体の時間は重複していませんが、移動・準備バッファ（予定A: ${targetBuffer}分 / 既存: ${existingBuffer}分）を考慮すると移動が間に合わない過密スケジュールです。`,
            isHardOverlap: false,
          });
        }
      }
    }

    return Result.ok(undefined);
  }
}
