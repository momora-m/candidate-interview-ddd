import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type StageCode =
  | 'DOCUMENT_SCREENING'
  | 'CASUAL_INTERVIEW'
  | 'FIRST_TECHNICAL'
  | 'SECOND_MANAGEMENT'
  | 'FINAL_EXECUTIVE'
  | 'OFFER_NEGOTIATION'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface StageMeta {
  order: number;
  label: string;
  isTerminal: boolean;
  requiresInterview: boolean;
}

export const STAGE_DEFINITIONS: Record<StageCode, StageMeta> = {
  DOCUMENT_SCREENING: { order: 1, label: '書類選考', isTerminal: false, requiresInterview: false },
  CASUAL_INTERVIEW: { order: 2, label: 'カジュアル面談', isTerminal: false, requiresInterview: true },
  FIRST_TECHNICAL: { order: 3, label: '一次技術面接 / スキル評価', isTerminal: false, requiresInterview: true },
  SECOND_MANAGEMENT: { order: 4, label: '二次面接 / EM・組織面談', isTerminal: false, requiresInterview: true },
  FINAL_EXECUTIVE: { order: 5, label: '最終面接 / 役員・CTO面談', isTerminal: false, requiresInterview: true },
  OFFER_NEGOTIATION: { order: 6, label: '内定・オファー面談 / 条件提示', isTerminal: false, requiresInterview: true },
  ACCEPTED: { order: 7, label: '内定承諾 / 入社合意', isTerminal: true, requiresInterview: false },
  REJECTED: { order: 99, label: 'お見送り', isTerminal: true, requiresInterview: false },
  WITHDRAWN: { order: 100, label: '選考辞退', isTerminal: true, requiresInterview: false },
};

interface SelectionStageProps {
  code: StageCode;
}

export class SelectionStage extends ValueObject<SelectionStageProps> {
  private constructor(props: SelectionStageProps) {
    super(props);
  }

  public get code(): StageCode {
    return this.props.code;
  }

  public get label(): string {
    return STAGE_DEFINITIONS[this.props.code].label;
  }

  public get order(): number {
    return STAGE_DEFINITIONS[this.props.code].order;
  }

  public get isTerminal(): boolean {
    return STAGE_DEFINITIONS[this.props.code].isTerminal;
  }

  public get requiresInterview(): boolean {
    return STAGE_DEFINITIONS[this.props.code].requiresInterview;
  }

  public static create(code: StageCode): Result<SelectionStage> {
    if (!STAGE_DEFINITIONS[code]) {
      return Result.fail(`不正な選考ステージコードです: ${code}`);
    }
    return Result.ok(new SelectionStage({ code }));
  }

  public getNextStage(): SelectionStage | null {
    switch (this.props.code) {
      case 'DOCUMENT_SCREENING':
        return new SelectionStage({ code: 'CASUAL_INTERVIEW' });
      case 'CASUAL_INTERVIEW':
        return new SelectionStage({ code: 'FIRST_TECHNICAL' });
      case 'FIRST_TECHNICAL':
        return new SelectionStage({ code: 'SECOND_MANAGEMENT' });
      case 'SECOND_MANAGEMENT':
        return new SelectionStage({ code: 'FINAL_EXECUTIVE' });
      case 'FINAL_EXECUTIVE':
        return new SelectionStage({ code: 'OFFER_NEGOTIATION' });
      case 'OFFER_NEGOTIATION':
        return new SelectionStage({ code: 'ACCEPTED' });
      default:
        return null;
    }
  }

  public canTransitionTo(next: SelectionStage): boolean {
    if (this.isTerminal) return false;
    if (next.code === 'REJECTED' || next.code === 'WITHDRAWN') return true;
    return next.order > this.order;
  }

  public toString(): string {
    return this.label;
  }
}
