-- 画面と同じ初期データ。PostgreSQL 公式イメージが空のデータディレクトリで
-- /docker-entrypoint-initdb.d の SQL をファイル名順に実行する。
-- 001_initial.sql の後に流れる。再実行は想定しない（初期化は初回起動時のみ）。

CREATE TEMP TABLE seed_clock AS
SELECT
  (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + interval '2 days' + time '15:00')
    AT TIME ZONE 'Asia/Tokyo' AS app1_start,
  (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + interval '2 days' + time '16:00')
    AT TIME ZONE 'Asia/Tokyo' AS app1_end,
  (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') - interval '1 day' + time '19:00')
    AT TIME ZONE 'Asia/Tokyo' AS app2_start,
  (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') - interval '1 day' + time '19:45')
    AT TIME ZONE 'Asia/Tokyo' AS app2_end;

INSERT INTO target_companies (
  id,
  name,
  product_summary,
  target_audience,
  revenue_stream,
  key_competitors,
  primary_languages,
  cloud_platform,
  architecture_highlights,
  tech_blog_urls,
  overall_attractiveness_summary,
  corporate_mission,
  created_at,
  updated_at
) VALUES
(
  'comp_001',
  '株式会社ネクスト・プラットフォーム (NextPlatform Inc.)',
  '急成長中のエンジニア組織向け生産性向上SaaS',
  'B2B_ENTERPRISE',
  '年額エンタープライズ契約 + アカウント課金',
  ARRAY['Linear', 'Jira', 'Findy'],
  ARRAY['TypeScript', 'Go', 'Rust'],
  'GCP',
  ARRAY['Google Cloud Run', 'Cloud Pub/Sub', 'Clean Architecture / DDD', 'PostgreSQL'],
  ARRAY[
    'https://tech.example.com/posts/migrating-monolith-to-ddd',
    'https://speakerdeck.com/example/cloud-native-resilience'
  ],
  '技術的負債解消とDDDリアーキテクチャに積極投資しており、技術選定の裁量が大きい。',
  '開発組織の知性を解放し、ソフトウェアエンジニアリングを最高に面白くする。',
  now(),
  now()
),
(
  'comp_002',
  'グローバル・フィンテック株式会社 (Global FinPay)',
  'グローバル決済オーケストレーション基盤',
  'B2B_ENTERPRISE',
  '決済トランザクション手数料 (0.8%〜)',
  ARRAY['Stripe', 'Adyen'],
  ARRAY['Go', 'TypeScript', 'Kotlin'],
  'AWS',
  ARRAY['Event Sourcing / CQRS', 'Kafka', 'Multi-Region High Availability'],
  ARRAY['https://tech.finpay.example.com/cqrs-in-production'],
  'ミッションクリティカルな決済基盤で、秒間数万件の耐障害設計に携われる。',
  '国境のないシームレスな金融インフラを創る。',
  now(),
  now()
);

INSERT INTO stocked_reverse_questions (
  id, company_id, category, target_role, question_text, hypothesis_or_intent, sort_order
) VALUES
(
  'q_001',
  'comp_001',
  'TECH_STACK',
  'LEAD_ENGINEER',
  'マイクロサービスとイベント駆動（Pub/Sub）間の整合性・分散トランザクションの設計方針はどうなっていますか？',
  'ブログのDDD記事に言及されていたイベントバスの実態と、現場での運用課題の深さを探る',
  0
),
(
  'q_002',
  'comp_001',
  'ORGANIZATION',
  'ENGINEERING_MANAGER',
  'スタッフエンジニア/テックリード層に期待される四半期ごとの技術意思決定と評価軸を教えてください。',
  '自分のバリュー発揮ポイントとEMの評価期待値が一致しているか擦り合わせる',
  1
),
(
  'q_003',
  'comp_001',
  'ROADMAP',
  'EXECUTIVE_CTO',
  '今後2年間でグローバル展開（海外エンジニアチーム組成）を予定されている中で、アーキテクチャの最大のボトルネックは何と捉えていますか？',
  'CTOの長期技術ビジョンと事業成長戦略の連動度合いを確かめる',
  2
),
(
  'q_004',
  'comp_002',
  'TECH_STACK',
  'LEAD_ENGINEER',
  'Event SourcingとCQRSのイベントスキーマ変更（マイグレーション）は実運用でどのように対応されていますか？',
  'CQRS採用時の一番のペインポイントであるスキーマ進化の運用プラクティスを現場視点で知りたい',
  0
);

INSERT INTO job_applications (
  id,
  company_id,
  position_title,
  job_description_url,
  salary_min_amount,
  salary_max_amount,
  salary_currency,
  target_seniority,
  desirability_rating,
  why_this_role,
  value_proposition,
  career_growth_alignment,
  current_stage,
  status,
  version,
  created_at,
  updated_at
) VALUES
(
  'app_001',
  'comp_001',
  'Staff Backend Engineer (Architecture & Platform)',
  'https://recruit.example.com/job/staff-backend',
  11000000,
  14000000,
  'JPY',
  'Staff / Tech Lead',
  5,
  'DDDの本格適用とマイクロサービス刷新をアーキテクトとして主導できるフェーズに強く惹かれているため。',
  '過去5年間にわたる決済・認証基盤のClean Architecture刷新とチームリードの実績をそのまま再現できる。',
  '技術組織全体のアーキテクチャ標準化とスタッフエンジニアとしての影響力拡大。',
  'SECOND_MANAGEMENT',
  'IN_PROGRESS',
  1,
  now(),
  now()
),
(
  'app_002',
  'comp_002',
  'Senior Distributed Systems Engineer (Go/CQRS)',
  'https://careers.finpay.example.com/distributed-eng',
  12000000,
  16000000,
  'JPY',
  'Senior Specialist',
  4,
  'グローバル決済の超高トラフィック環境でKafka / CQRSを用いた堅牢なシステムを構築したいため。',
  '分散ロック・冪等性設計の深い実務知見。',
  '大規模トランザクション処理におけるスペシャリストへの深化。',
  'CASUAL_INTERVIEW',
  'IN_PROGRESS',
  1,
  now(),
  now()
);

INSERT INTO interview_sessions (
  id,
  application_id,
  stage_code,
  starts_at,
  ends_at,
  format_type,
  meeting_url,
  meeting_platform,
  location_name,
  room_name,
  reception_instructions,
  estimated_travel_minutes,
  interviewer_names,
  is_completed,
  reflection_candidate_performance_rating,
  reflection_company_impression_rating,
  reflection_key_learnings,
  reflection_concerns,
  reflection_next_actions,
  reflection_recorded_at,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'sess_001',
  'app_001',
  'SECOND_MANAGEMENT',
  app1_start,
  app1_end,
  'IN_PERSON',
  NULL,
  NULL,
  '渋谷スクランブルスクエア 24F',
  'Meeting Room Theta',
  '受付QRコードをスマートフォンで提示し入館してください',
  45,
  ARRAY['EM 山田', '人事責任者 松本'],
  FALSE,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  now(),
  now()
FROM seed_clock
UNION ALL
SELECT
  'sess_002',
  'app_002',
  'CASUAL_INTERVIEW',
  app2_start,
  app2_end,
  'ONLINE',
  'https://meet.google.com/finpay-eng-casual',
  'GOOGLE_MEET',
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY['テックリード 佐藤', 'Recruiter 木村'],
  TRUE,
  5,
  4,
  '技術水準が極めて高く、エンジニア同士の議論が非常に活発。開発スピードと品質のバランスも良い。',
  'オンコール当番の頻度がチーム規模の割にやや高めかもしれない（次回技術面接で確認要）。',
  '次回一次技術面接に向けてライブコーディングと分散システム設計問題の復習を行う。',
  app2_end,
  0,
  now(),
  now()
FROM seed_clock;

INSERT INTO assigned_reverse_questions (
  id,
  session_id,
  source_question_id,
  category,
  customized_question_text,
  is_asked,
  obtained_answer,
  insight_rating,
  sort_order
) VALUES
(
  'aq_001',
  'sess_001',
  'q_002',
  'ORGANIZATION',
  '山田さんのチームでは、スタッフエンジニアの技術的意思決定をEMとしてどうバックアップ・評価されていますか？',
  FALSE,
  NULL,
  NULL,
  0
),
(
  'aq_002',
  'sess_002',
  'q_004',
  'TECH_STACK',
  '直近のKafkaイベントスキーマ変更のマイグレーション事例について伺えますか？',
  TRUE,
  'Protocol Buffersの後方互換ルールをCIで厳格にチェックし、デュアルリード・デュアルライト期間を設けて移行しているとのこと。非常に合理的。',
  5,
  0
);

INSERT INTO preparation_todos (
  id,
  application_id,
  interview_session_id,
  task_type,
  title,
  description,
  status,
  priority,
  due_date,
  created_at,
  completed_at,
  sort_order
)
SELECT
  todo.id,
  todo.application_id,
  todo.session_id,
  todo.task_type,
  CASE
    WHEN todo.task_type = 'ATTEND_INTERVIEW' THEN
      format(
        '【%s】面接本番 (%s/%s/%s(%s) %s〜%s (%s分))',
        todo.stage_label,
        to_char(todo.starts_at AT TIME ZONE 'Asia/Tokyo', 'YYYY'),
        to_char(todo.starts_at AT TIME ZONE 'Asia/Tokyo', 'MM'),
        to_char(todo.starts_at AT TIME ZONE 'Asia/Tokyo', 'DD'),
        (ARRAY['日', '月', '火', '水', '木', '金', '土'])[
          EXTRACT(DOW FROM (todo.starts_at AT TIME ZONE 'Asia/Tokyo'))::int + 1
        ],
        to_char(todo.starts_at AT TIME ZONE 'Asia/Tokyo', 'HH24:MI'),
        to_char(todo.ends_at AT TIME ZONE 'Asia/Tokyo', 'HH24:MI'),
        (EXTRACT(EPOCH FROM (todo.ends_at - todo.starts_at)) / 60)::int
      )
    ELSE format('【%s】%s', todo.stage_label, todo.title_suffix)
  END,
  format('フェーズ「%s」における面接事前準備・事後タスク', todo.stage_label),
  todo.status,
  todo.priority,
  todo.starts_at,
  now(),
  CASE WHEN todo.status = 'DONE' THEN todo.ends_at ELSE NULL END,
  todo.sort_order
FROM (
  SELECT
    defs.id,
    defs.application_id,
    defs.session_id,
    defs.task_type,
    defs.title_suffix,
    defs.status,
    defs.priority,
    defs.sort_order,
    defs.stage_label,
    clock.starts_at,
    clock.ends_at
  FROM (
    VALUES
      ('todo_001', 'app_001', 'sess_001', 'PRE_INTERVIEW_RESEARCH', '企業リサーチ・最新ニュース/技術ブログ確認', 'TODO', 'HIGH', 0, '二次面接 / EM・組織面談'),
      ('todo_002', 'app_001', 'sess_001', 'REVERSE_QUESTION_PREP', '逆質問の選定と文脈カスタマイズ', 'TODO', 'HIGH', 1, '二次面接 / EM・組織面談'),
      ('todo_003', 'app_001', 'sess_001', 'RESUME_PORTFOLIO_REVIEW', 'アピール実績・想定問答の事前整理', 'TODO', 'MEDIUM', 2, '二次面接 / EM・組織面談'),
      ('todo_004', 'app_001', 'sess_001', 'ATTEND_INTERVIEW', '面接本番', 'TODO', 'URGENT', 3, '二次面接 / EM・組織面談'),
      ('todo_005', 'app_001', 'sess_001', 'POST_INTERVIEW_REFLECTION', '面接振り返り・逆質問回答メモの入力', 'TODO', 'URGENT', 4, '二次面接 / EM・組織面談'),
      ('todo_006', 'app_001', 'sess_001', 'THANK_YOU_NOTE', '面接お礼メール・追加資料の送付', 'TODO', 'MEDIUM', 5, '二次面接 / EM・組織面談'),
      ('todo_007', 'app_002', 'sess_002', 'PRE_INTERVIEW_RESEARCH', '企業リサーチ・最新ニュース/技術ブログ確認', 'TODO', 'HIGH', 0, 'カジュアル面談'),
      ('todo_008', 'app_002', 'sess_002', 'REVERSE_QUESTION_PREP', '逆質問の選定と文脈カスタマイズ', 'TODO', 'HIGH', 1, 'カジュアル面談'),
      ('todo_009', 'app_002', 'sess_002', 'RESUME_PORTFOLIO_REVIEW', 'アピール実績・想定問答の事前整理', 'TODO', 'MEDIUM', 2, 'カジュアル面談'),
      ('todo_010', 'app_002', 'sess_002', 'ATTEND_INTERVIEW', '面接本番', 'DONE', 'URGENT', 3, 'カジュアル面談'),
      ('todo_011', 'app_002', 'sess_002', 'POST_INTERVIEW_REFLECTION', '面接振り返り・逆質問回答メモの入力', 'DONE', 'URGENT', 4, 'カジュアル面談'),
      ('todo_012', 'app_002', 'sess_002', 'THANK_YOU_NOTE', '面接お礼メール・追加資料の送付', 'TODO', 'MEDIUM', 5, 'カジュアル面談')
  ) AS defs (
    id,
    application_id,
    session_id,
    task_type,
    title_suffix,
    status,
    priority,
    sort_order,
    stage_label
  )
  JOIN (
    SELECT 'sess_001' AS session_id, app1_start AS starts_at, app1_end AS ends_at FROM seed_clock
    UNION ALL
    SELECT 'sess_002', app2_start, app2_end FROM seed_clock
  ) AS clock ON clock.session_id = defs.session_id
) AS todo;

INSERT INTO proposed_schedules (
  id,
  application_id,
  stage_code,
  status,
  format_type,
  meeting_url,
  meeting_platform,
  note,
  sort_order,
  created_at,
  updated_at
) VALUES (
  'prop_001',
  'app_002',
  'FIRST_TECHNICAL',
  'PENDING',
  'ONLINE',
  'https://meet.google.com/finpay-next',
  'GOOGLE_MEET',
  '一次技術面接の候補として先方へ出している枠',
  0,
  now(),
  now()
);

INSERT INTO proposed_schedule_slots (proposed_schedule_id, slot_index, starts_at, ends_at)
SELECT
  'prop_001',
  slot.slot_index,
  (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + slot.start_offset) AT TIME ZONE 'Asia/Tokyo',
  (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + slot.end_offset) AT TIME ZONE 'Asia/Tokyo'
FROM (
  VALUES
    (0, interval '7 days 10 hours', interval '7 days 11 hours'),
    (1, interval '7 days 14 hours', interval '7 days 15 hours')
) AS slot (slot_index, start_offset, end_offset);
