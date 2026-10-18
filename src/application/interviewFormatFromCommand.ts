import { InterviewFormat } from '@/domain/interview/InterviewFormat';
import { MeetingUrl } from '@/domain/interview/MeetingUrl';
import { Result } from '@/domain/shared/Result';

export interface InterviewFormatCommand {
  formatType: 'ONLINE' | 'IN_PERSON';
  meetingUrl?: string;
  meetingPasscode?: string;
  locationName?: string;
  roomName?: string;
  receptionInstructions?: string;
  estimatedTravelMinutes?: number;
}

export function interviewFormatFromCommand(
  command: InterviewFormatCommand
): Result<InterviewFormat> {
  if (command.formatType === 'ONLINE') {
    const urlRes = MeetingUrl.create(command.meetingUrl || 'https://zoom.us/j/100000000');
    if (urlRes.isFailure()) {
      return Result.fail(urlRes.getError());
    }
    return InterviewFormat.createOnline(urlRes.getValue(), command.meetingPasscode);
  }

  return InterviewFormat.createInPerson(
    command.locationName || '東京本社オフィス',
    command.roomName || '会議室A',
    command.receptionInstructions,
    command.estimatedTravelMinutes ?? 45
  );
}

export function conflictMessage(prefix: string, overlapReason: string, stageName: string, timeWindowJP: string): string {
  return `${prefix}${overlapReason} (${stageName} / ${timeWindowJP})`;
}
