import { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { IEventBus } from '@/application/events/IEventBus';
import { TargetCompany } from '@/domain/company/TargetCompany';
import { CompanyId } from '@/domain/company/CompanyId';
import { CompanyProfile } from '@/domain/company/CompanyProfile';
import { BusinessModel } from '@/domain/company/BusinessModel';
import { TechStackProfile } from '@/domain/company/TechStackProfile';
import { StockedReverseQuestion } from '@/domain/company/StockedReverseQuestion';
import { JobApplication } from '@/domain/application/JobApplication';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { PositionDetails } from '@/domain/application/PositionDetails';
import { SalaryRange } from '@/domain/application/SalaryRange';
import { PositionMotivation } from '@/domain/application/PositionMotivation';
import { TimeWindow } from '@/domain/interview/TimeWindow';
import { InterviewFormat } from '@/domain/interview/InterviewFormat';
import { MeetingUrl } from '@/domain/interview/MeetingUrl';
import { InterviewReflection } from '@/domain/interview/InterviewReflection';

export async function seedCandidateData(
  companyRepo: ITargetCompanyRepository,
  applicationRepo: IJobApplicationRepository,
  eventBus: IEventBus
): Promise<void> {
  // 1. Company 1: Cloud Native SaaS (DDD & Go/TypeScript)
  const comp1Biz = BusinessModel.create({
    productSummary: '急成長中のエンジニア組織向け生産性向上SaaS',
    targetAudience: 'B2B_ENTERPRISE',
    revenueStream: '年額エンタープライズ契約 + アカウント課金',
    keyCompetitors: ['Linear', 'Jira', 'Findy'],
  }).getValue();

  const comp1Tech = TechStackProfile.create({
    primaryLanguages: ['TypeScript', 'Go', 'Rust'],
    cloudPlatform: 'GCP',
    architectureHighlights: ['Google Cloud Run', 'Cloud Pub/Sub', 'Clean Architecture / DDD', 'PostgreSQL'],
    techBlogUrls: [
      'https://tech.example.com/posts/migrating-monolith-to-ddd',
      'https://speakerdeck.com/example/cloud-native-resilience',
    ],
  }).getValue();

  const comp1Profile = CompanyProfile.create({
    businessModel: comp1Biz,
    techStack: comp1Tech,
    overallAttractivenessSummary: '技術的負債解消とDDDリアーキテクチャに積極投資しており、技術選定の裁量が大きい。',
    corporateMission: '開発組織の知性を解放し、ソフトウェアエンジニアリングを最高に面白くする。',
  }).getValue();

  const comp1 = TargetCompany.create({
    id: CompanyId.create('comp_001').getValue(),
    name: '株式会社ネクスト・プラットフォーム (NextPlatform Inc.)',
    profile: comp1Profile,
  }).getValue();

  comp1.addStockedQuestion(
    StockedReverseQuestion.create({
      id: 'q_001',
      category: 'TECH_STACK',
      targetRole: 'LEAD_ENGINEER',
      questionText: 'マイクロサービスとイベント駆動（Pub/Sub）間の整合性・分散トランザクションの設計方針はどうなっていますか？',
      hypothesisOrIntent: 'ブログのDDD記事に言及されていたイベントバスの実態と、現場での運用課題の深さを探る',
    }).getValue()
  );

  comp1.addStockedQuestion(
    StockedReverseQuestion.create({
      id: 'q_002',
      category: 'ORGANIZATION',
      targetRole: 'ENGINEERING_MANAGER',
      questionText: 'スタッフエンジニア/テックリード層に期待される四半期ごとの技術意思決定と評価軸を教えてください。',
      hypothesisOrIntent: '自分のバリュー発揮ポイントとEMの評価期待値が一致しているか擦り合わせる',
    }).getValue()
  );

  comp1.addStockedQuestion(
    StockedReverseQuestion.create({
      id: 'q_003',
      category: 'ROADMAP',
      targetRole: 'EXECUTIVE_CTO',
      questionText: '今後2年間でグローバル展開（海外エンジニアチーム組成）を予定されている中で、アーキテクチャの最大のボトルネックは何と捉えていますか？',
      hypothesisOrIntent: 'CTOの長期技術ビジョンと事業成長戦略の連動度合いを確かめる',
    }).getValue()
  );

  await companyRepo.save(comp1);

  // 2. Company 2: FinTech & Global Payment
  const comp2Biz = BusinessModel.create({
    productSummary: 'グローバル決済オーケストレーション基盤',
    targetAudience: 'B2B_ENTERPRISE',
    revenueStream: '決済トランザクション手数料 (0.8%〜)',
    keyCompetitors: ['Stripe', 'Adyen'],
  }).getValue();

  const comp2Tech = TechStackProfile.create({
    primaryLanguages: ['Go', 'TypeScript', 'Kotlin'],
    cloudPlatform: 'AWS',
    architectureHighlights: ['Event Sourcing / CQRS', 'Kafka', 'Multi-Region High Availability'],
    techBlogUrls: ['https://tech.finpay.example.com/cqrs-in-production'],
  }).getValue();

  const comp2Profile = CompanyProfile.create({
    businessModel: comp2Biz,
    techStack: comp2Tech,
    overallAttractivenessSummary: 'ミッションクリティカルな決済基盤で、秒間数万件の耐障害設計に携われる。',
    corporateMission: '国境のないシームレスな金融インフラを創る。',
  }).getValue();

  const comp2 = TargetCompany.create({
    id: CompanyId.create('comp_002').getValue(),
    name: 'グローバル・フィンテック株式会社 (Global FinPay)',
    profile: comp2Profile,
  }).getValue();

  comp2.addStockedQuestion(
    StockedReverseQuestion.create({
      id: 'q_004',
      category: 'TECH_STACK',
      targetRole: 'LEAD_ENGINEER',
      questionText: 'Event SourcingとCQRSのイベントスキーマ変更（マイグレーション）は実運用でどのように対応されていますか？',
      hypothesisOrIntent: 'CQRS採用時の一番のペインポイントであるスキーマ進化の運用プラクティスを現場視点で知りたい',
    }).getValue()
  );

  await companyRepo.save(comp2);

  // 3. Application 1: Staff Backend / Architect at NextPlatform (Second Management Stage)
  const app1 = JobApplication.create({
    id: ApplicationId.create('app_001').getValue(),
    companyId: comp1.id,
    positionDetails: PositionDetails.create({
      title: 'Staff Backend Engineer (Architecture & Platform)',
      jobDescriptionUrl: 'https://recruit.example.com/job/staff-backend',
      expectedSalaryRange: SalaryRange.create({ minAmount: 11000000, maxAmount: 14000000 }).getValue(),
      targetSeniority: 'Staff / Tech Lead',
      desirabilityRating: 5,
    }).getValue(),
    motivation: PositionMotivation.create({
      whyThisRole: 'DDDの本格適用とマイクロサービス刷新をアーキテクトとして主導できるフェーズに強く惹かれているため。',
      valueProposition: '過去5年間にわたる決済・認証基盤のClean Architecture刷新とチームリードの実績をそのまま再現できる。',
      careerGrowthAlignment: '技術組織全体のアーキテクチャ標準化とスタッフエンジニアとしての影響力拡大。',
    }).getValue(),
    initialStageCode: 'SECOND_MANAGEMENT',
  }).getValue();

  // Schedule upcoming Second Interview for App 1
  const now = new Date();
  const app1Start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later
  app1Start.setHours(15, 0, 0, 0);
  const app1End = new Date(app1Start.getTime() + 60 * 60 * 1000);

  const sched1Res = app1.scheduleInterview({
    timeWindow: TimeWindow.create(app1Start, app1End).getValue(),
    format: InterviewFormat.createInPerson(
      '渋谷スクランブルスクエア 24F',
      'Meeting Room Theta',
      '受付QRコードをスマートフォンで提示し入館してください',
      45
    ).getValue(),
    interviewerNames: ['EM 山田', '人事責任者 松本'],
  });

  if (sched1Res.isSuccess()) {
    const session = sched1Res.getValue();
    // Assign stocked question q_002
    app1.assignStockedQuestion(
      session.id,
      comp1.stockedQuestions.find((q) => q.id === 'q_002')!,
      '山田さんのチームでは、スタッフエンジニアの技術的意思決定をEMとしてどうバックアップ・評価されていますか？'
    );
  }

  await applicationRepo.save(app1);

  // 4. Application 2: Senior Distributed Systems Engineer at Global FinPay (Casual Interview completed with Reflection)
  const app2 = JobApplication.create({
    id: ApplicationId.create('app_002').getValue(),
    companyId: comp2.id,
    positionDetails: PositionDetails.create({
      title: 'Senior Distributed Systems Engineer (Go/CQRS)',
      jobDescriptionUrl: 'https://careers.finpay.example.com/distributed-eng',
      expectedSalaryRange: SalaryRange.create({ minAmount: 12000000, maxAmount: 16000000 }).getValue(),
      targetSeniority: 'Senior Specialist',
      desirabilityRating: 4,
    }).getValue(),
    motivation: PositionMotivation.create({
      whyThisRole: 'グローバル決済の超高トラフィック環境でKafka / CQRSを用いた堅牢なシステムを構築したいため。',
      valueProposition: '分散ロック・冪等性設計の深い実務知見。',
      careerGrowthAlignment: '大規模トランザクション処理におけるスペシャリストへの深化。',
    }).getValue(),
    initialStageCode: 'CASUAL_INTERVIEW',
  }).getValue();

  const app2Start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  app2Start.setHours(19, 0, 0, 0);
  const app2End = new Date(app2Start.getTime() + 45 * 60 * 1000);

  const sched2Res = app2.scheduleInterview({
    timeWindow: TimeWindow.create(app2Start, app2End).getValue(),
    format: InterviewFormat.createOnline(
      MeetingUrl.create('https://meet.google.com/finpay-eng-casual').getValue()
    ).getValue(),
    interviewerNames: ['テックリード 佐藤', 'Recruiter 木村'],
  });

  if (sched2Res.isSuccess()) {
    const s2 = sched2Res.getValue();
    app2.assignStockedQuestion(
      s2.id,
      comp2.stockedQuestions.find((q) => q.id === 'q_004')!,
      '直近のKafkaイベントスキーマ変更のマイグレーション事例について伺えますか？'
    );

    // Record question answer & reflection
    app2.recordQuestionAnswer(
      s2.id,
      s2.assignedQuestions[0].id,
      'Protocol Buffersの後方互換ルールをCIで厳格にチェックし、デュアルリード・デュアルライト期間を設けて移行しているとのこと。非常に合理的。',
      5
    );

    app2.recordInterviewReflection(
      s2.id,
      InterviewReflection.create({
        candidatePerformanceRating: 5,
        companyImpressionRating: 4,
        keyLearningsAndInsights: '技術水準が極めて高く、エンジニア同士の議論が非常に活発。開発スピードと品質のバランスも良い。',
        concernsOrRedFlags: 'オンコール当番の頻度がチーム規模の割にやや高めかもしれない（次回技術面接で確認要）。',
        nextActionNotes: '次回一次技術面接に向けてライブコーディングと分散システム設計問題の復習を行う。',
      }).getValue()
    );
  }

  await applicationRepo.save(app2);
}
