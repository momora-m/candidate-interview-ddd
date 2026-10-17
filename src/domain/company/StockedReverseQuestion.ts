import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type QuestionCategory =
  | 'CULTURE'
  | 'TECH_STACK'
  | 'ROADMAP'
  | 'EVALUATION'
  | 'ORGANIZATION';

export type TargetInterviewerRole =
  | 'LEAD_ENGINEER'
  | 'ENGINEERING_MANAGER'
  | 'EXECUTIVE_CTO'
  | 'TALENT_ACQUISITION';

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  CULTURE: '企業文化・チーム開発の進め方',
  TECH_STACK: '技術スタック・アーキテクチャ・負債',
  ROADMAP: '事業ロードマップ・今後の投資方針',
  EVALUATION: '評価制度・期待されるシニアリティ',
  ORGANIZATION: '組織体制・意思決定プロセス',
};

export const TARGET_ROLE_LABELS: Record<TargetInterviewerRole, string> = {
  LEAD_ENGINEER: '現場テックリード / シニアエンジニア',
  ENGINEERING_MANAGER: 'エンジニアリングマネージャー (EM)',
  EXECUTIVE_CTO: '役員 / 経営層 (CTO/CEO/VPoE)',
  TALENT_ACQUISITION: '採用人事 (HR/Recruiter)',
};

export interface StockedReverseQuestionProps {
  id: string;
  category: QuestionCategory;
  targetRole: TargetInterviewerRole;
  questionText: string;
  hypothesisOrIntent: string;
}

export class StockedReverseQuestion extends ValueObject<StockedReverseQuestionProps> {
  private constructor(props: StockedReverseQuestionProps) {
    super(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get category(): QuestionCategory {
    return this.props.category;
  }

  public get categoryLabel(): string {
    return QUESTION_CATEGORY_LABELS[this.props.category];
  }

  public get targetRole(): TargetInterviewerRole {
    return this.props.targetRole;
  }

  public get targetRoleLabel(): string {
    return TARGET_ROLE_LABELS[this.props.targetRole];
  }

  public get questionText(): string {
    return this.props.questionText;
  }

  public get hypothesisOrIntent(): string {
    return this.props.hypothesisOrIntent;
  }

  public static create(props: {
    id?: string;
    category: QuestionCategory;
    targetRole: TargetInterviewerRole;
    questionText: string;
    hypothesisOrIntent: string;
  }): Result<StockedReverseQuestion> {
    if (!props.questionText || props.questionText.trim().length === 0) {
      return Result.fail('逆質問の質問文は必須です。');
    }

    if (!props.hypothesisOrIntent || props.hypothesisOrIntent.trim().length === 0) {
      return Result.fail('質問の意図・検証したい仮説（Hypothesis/Intent）の入力は必須です。');
    }

    const id =
      props.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    return Result.ok(
      new StockedReverseQuestion({
        id,
        category: props.category,
        targetRole: props.targetRole,
        questionText: props.questionText.trim(),
        hypothesisOrIntent: props.hypothesisOrIntent.trim(),
      })
    );
  }
}
