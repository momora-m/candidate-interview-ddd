import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';
import { MeetingUrl } from './MeetingUrl';

export type FormatType = 'ONLINE' | 'IN_PERSON';

interface OnlineFormatProps {
  type: 'ONLINE';
  meetingUrl: MeetingUrl;
  meetingPasscode?: string;
  notes?: string;
}

interface InPersonFormatProps {
  type: 'IN_PERSON';
  locationName: string;
  roomName: string;
  receptionInstructions: string;
  estimatedTravelMinutes: number; // e.g. 45 mins
}

type InterviewFormatProps = OnlineFormatProps | InPersonFormatProps;

export class InterviewFormat extends ValueObject<InterviewFormatProps> {
  private constructor(props: InterviewFormatProps) {
    super(props);
  }

  public get type(): FormatType {
    return this.props.type;
  }

  public get isOnline(): boolean {
    return this.props.type === 'ONLINE';
  }

  public get onlineDetails(): OnlineFormatProps | null {
    return this.props.type === 'ONLINE' ? this.props : null;
  }

  public get inPersonDetails(): InPersonFormatProps | null {
    return this.props.type === 'IN_PERSON' ? this.props : null;
  }

  public get travelBufferMinutes(): number {
    if (this.props.type === 'IN_PERSON') {
      return this.props.estimatedTravelMinutes || 45;
    }
    return 10; // 10 min prep/connect buffer for online
  }

  public static createOnline(
    meetingUrl: MeetingUrl,
    meetingPasscode?: string,
    notes?: string
  ): Result<InterviewFormat> {
    return Result.ok(
      new InterviewFormat({
        type: 'ONLINE',
        meetingUrl,
        meetingPasscode: meetingPasscode?.trim(),
        notes: notes?.trim(),
      })
    );
  }

  public static createInPerson(
    locationName: string,
    roomName: string,
    receptionInstructions?: string,
    estimatedTravelMinutes?: number
  ): Result<InterviewFormat> {
    if (!locationName || locationName.trim().length === 0) {
      return Result.fail('対面面接のオフィス拠点名は必須です。');
    }
    if (!roomName || roomName.trim().length === 0) {
      return Result.fail('会議室名は必須です。');
    }

    return Result.ok(
      new InterviewFormat({
        type: 'IN_PERSON',
        locationName: locationName.trim(),
        roomName: roomName.trim(),
        receptionInstructions: receptionInstructions?.trim() || '受付にて面接の旨をお伝えください。',
        estimatedTravelMinutes: estimatedTravelMinutes !== undefined && estimatedTravelMinutes >= 0 ? estimatedTravelMinutes : 45,
      })
    );
  }

  public getDisplaySummary(): string {
    if (this.props.type === 'ONLINE') {
      return `オンライン (${this.props.meetingUrl.platform}): ${this.props.meetingUrl.url}`;
    }
    return `対面: ${this.props.locationName} (${this.props.roomName}) [移動見込: ${this.props.estimatedTravelMinutes}分]`;
  }
}
