import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TargetCompany } from '../../src/domain/company/TargetCompany';
import { CompanyProfile } from '../../src/domain/company/CompanyProfile';
import { BusinessModel } from '../../src/domain/company/BusinessModel';
import { TechStackProfile } from '../../src/domain/company/TechStackProfile';
import { StockedReverseQuestion } from '../../src/domain/company/StockedReverseQuestion';
import { AssignedReverseQuestion } from '../../src/domain/interview/AssignedReverseQuestion';

describe('TargetCompany & StockedReverseQuestion Domain Model', () => {
  test('creates a valid TargetCompany aggregate with profile and stocked questions', () => {
    const bizRes = BusinessModel.create({
      productSummary: 'クラウド型HR Tech SaaS',
      targetAudience: 'B2B_ENTERPRISE',
      revenueStream: '月額サブスクリプション + API利用量課金',
      keyCompetitors: ['SmartHR', 'Workday'],
    });
    assert.ok(bizRes.isSuccess());

    const techRes = TechStackProfile.create({
      primaryLanguages: ['TypeScript', 'Go', 'Rust'],
      cloudPlatform: 'GCP',
      architectureHighlights: ['Cloud Run', 'Event-Driven Pub/Sub', 'DDD/Clean Architecture'],
      techBlogUrls: ['https://tech.example.com/posts/ddd-migration'],
    });
    assert.ok(techRes.isSuccess());

    const profileRes = CompanyProfile.create({
      businessModel: bizRes.getValue(),
      techStack: techRes.getValue(),
      overallAttractivenessSummary: 'DDD刷新フェーズで技術的裁量が大きい',
    });
    assert.ok(profileRes.isSuccess());

    const companyRes = TargetCompany.create({
      name: '株式会社ネクスト・アーキテクチャ',
      profile: profileRes.getValue(),
    });
    assert.ok(companyRes.isSuccess());

    const company = companyRes.getValue();
    assert.equal(company.name, '株式会社ネクスト・アーキテクチャ');
    assert.equal(company.stockedQuestions.length, 0);

    // Add stocked reverse questions
    const q1 = StockedReverseQuestion.create({
      category: 'TECH_STACK',
      targetRole: 'LEAD_ENGINEER',
      questionText: 'マイクロサービス間のデータ整合性・Sagaパターンの適用状況はどうなっていますか？',
      hypothesisOrIntent: '技術ブログで分散トランザクションに言及があったため、実際の現場の泥臭い課題感を確認したい',
    }).getValue();

    const addRes = company.addStockedQuestion(q1);
    assert.ok(addRes.isSuccess());
    assert.equal(company.stockedQuestions.length, 1);
  });

  test('assigned question creates an immutable snapshot copy with customized text', () => {
    const stocked = StockedReverseQuestion.create({
      category: 'ORGANIZATION',
      targetRole: 'ENGINEERING_MANAGER',
      questionText: '技術的負債解消と新規機能開発の工数配分はどう決めていますか？',
      hypothesisOrIntent: 'EMがエンジニアの技術的改善提案をどう評価・受容するか見極める',
    }).getValue();

    const customized = '佐藤さんのチームでは、直近の四半期で負債解消に何割ほど工数を割けましたか？';
    const assigned = AssignedReverseQuestion.fromStocked(stocked, customized);

    assert.equal(assigned.sourceQuestionId, stocked.id);
    assert.equal(assigned.customizedQuestionText, customized);
    assert.equal(assigned.isAsked, false);
    assert.equal(assigned.obtainedAnswer, undefined);

    // Record answer
    const answered = assigned.recordAnswer('直近は全体の25%を技術負債とリファクタに固定枠として確保しています。', 5);
    assert.equal(answered.isAsked, true);
    assert.equal(answered.insightRating, 5);
    // Original assigned VO should remain immutable
    assert.equal(assigned.isAsked, false);
  });
});
