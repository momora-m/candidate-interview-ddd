import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type ApplicationStatusCode =
  | 'IN_PROGRESS'
  | 'OFFER_ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

interface StatusMeta {
  code: ApplicationStatusCode;
  label: string;
  isTerminal: boolean;
  badgeVariant: 'default' | 'success' | 'destructive' | 'secondary';
}

export const APPLICATION_STATUS_DEFINITIONS: Record<ApplicationStatusCode, StatusMeta> = {
  IN_PROGRESS: {
    code: 'IN_PROGRESS',
    label: '選考中',
    isTerminal: false,
    badgeVariant: 'default',
  },
  OFFER_ACCEPTED: {
    code: 'OFFER_ACCEPTED',
    label: '内定承諾 / 入社決定',
    isTerminal: true,
    badgeVariant: 'success',
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'お見送り',
    isTerminal: true,
    badgeVariant: 'destructive',
  },
  WITHDRAWN: {
    code: 'WITHDRAWN',
    label: '選考辞退',
    isTerminal: true,
    badgeVariant: 'secondary',
  },
};

interface ApplicationStatusProps {
  code: ApplicationStatusCode;
}

export class ApplicationStatus extends ValueObject<ApplicationStatusProps> {
  private constructor(props: ApplicationStatusProps) {
    super(props);
  }

  public get code(): ApplicationStatusCode {
    return this.props.code;
  }

  public get label(): string {
    return APPLICATION_STATUS_DEFINITIONS[this.props.code].label;
  }

  public get isTerminal(): boolean {
    return APPLICATION_STATUS_DEFINITIONS[this.props.code].isTerminal;
  }

  public static create(code: ApplicationStatusCode): Result<ApplicationStatus> {
    if (!APPLICATION_STATUS_DEFINITIONS[code]) {
      return Result.fail(`不正な選考ステータスです: ${code}`);
    }
    return Result.ok(new ApplicationStatus({ code }));
  }

  public static inProgress(): ApplicationStatus {
    return new ApplicationStatus({ code: 'IN_PROGRESS' });
  }

  public static offerAccepted(): ApplicationStatus {
    return new ApplicationStatus({ code: 'OFFER_ACCEPTED' });
  }

  public static rejected(): ApplicationStatus {
    return new ApplicationStatus({ code: 'REJECTED' });
  }

  public static withdrawn(): ApplicationStatus {
    return new ApplicationStatus({ code: 'WITHDRAWN' });
  }

  public toString(): string {
    return this.label;
  }
}
