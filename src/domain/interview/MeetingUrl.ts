import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type OnlineMeetingPlatform = 'ZOOM' | 'GOOGLE_MEET' | 'TEAMS' | 'OTHER';

interface MeetingUrlProps {
  url: string;
  platform: OnlineMeetingPlatform;
}

export class MeetingUrl extends ValueObject<MeetingUrlProps> {
  private constructor(props: MeetingUrlProps) {
    super(props);
  }

  public get url(): string {
    return this.props.url;
  }

  public get platform(): OnlineMeetingPlatform {
    return this.props.platform;
  }

  public static create(urlString: string): Result<MeetingUrl> {
    if (!urlString || typeof urlString !== 'string') {
      return Result.fail('ミーティングURLが空です。');
    }

    const trimmed = urlString.trim();

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return Result.fail('ミーティングURLは http または https プロトコルである必要があります。');
      }

      let platform: OnlineMeetingPlatform = 'OTHER';
      const host = parsed.hostname.toLowerCase();

      if (host.includes('zoom.us')) {
        platform = 'ZOOM';
      } else if (host.includes('meet.google.com')) {
        platform = 'GOOGLE_MEET';
      } else if (host.includes('teams.microsoft.com') || host.includes('teams.live.com')) {
        platform = 'TEAMS';
      }

      return Result.ok(new MeetingUrl({ url: trimmed, platform }));
    } catch {
      return Result.fail(`有効なURL形式ではありません: "${urlString}"`);
    }
  }

  public toString(): string {
    return this.url;
  }
}
