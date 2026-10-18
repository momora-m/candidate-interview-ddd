# アーキテクチャ決定記録 (Architecture Decision Records: ADR)

本リポジトリにおけるドメイン駆動設計（DDD）およびシステムアーキテクチャ上の主要な設計判断の記録です。

## インデックス

| ID | タイトル | ステータス | 決定日 |
| :--- | :--- | :--- | :--- |
| [ADR-0001](./0001-candidate-centric-domain-modeling.md) | 候補者（求職者自身）視点でのドメインモデリングへの転換 | 承認 (Accepted) | 2026-10-17 |
| [ADR-0002](./0002-separate-target-company-and-job-application-aggregates.md) | 志望企業（TargetCompany）と選考応募（JobApplication）の集約境界分離 | 承認 (Accepted) | 2026-10-17 |
| [ADR-0003](./0003-placement-of-position-motivation-in-job-application.md) | 志望動機（PositionMotivation）の JobApplication 集約への配置 | 承認 (Accepted) | 2026-10-17 |
| [ADR-0004](./0004-reverse-questions-as-immutable-vo-snapshot-copy.md) | 逆質問の面接割当における「不変スナップショットコピー（VO）」方式の採用 | 承認 (Accepted) | 2026-10-17 |
| [ADR-0005](./0005-travel-and-prep-buffers-in-schedule-conflict-detection.md) | 移動・準備バッファ（Travel Buffer）を考慮した日程重複・過密判定アルゴリズム | 承認 (Accepted) | 2026-10-17 |
| [ADR-0006](./0006-rdb-persistence-with-transactional-full-replace-for-child-entities.md) | RDB（PostgreSQL）永続化と子エンティティのトランザクション内全削除・一括再挿入方針 | 承認 (Accepted) | 2026-10-17 |
| [ADR-0007](./0007-pure-typescript-domain-with-result-type-and-event-bus.md) | 外部非依存の純粋 TypeScript ドメイン層、Result 型エラーハンドリング、およびドメインイベントバス | 承認 (Accepted) | 2026-10-17 |
| [ADR-0008](./0008-schema-first-openapi-and-code-generation.md) | Schema-First (OpenAPI 3.1) アプローチと openapi-typescript による型自動生成 | 承認 (Accepted) | 2026-10-17 |
| [ADR-0009](./0009-casual-interview-unified-as-session-entity.md) | カジュアル面談（Casual Interview）の選考セッションエンティティ統合モデリング方針 | 承認 (Accepted) | 2026-10-18 |
| [ADR-0010](./0010-proposed-schedule-slots-and-cross-company-conflict-prevention.md) | 日程調整における候補日提示枠（Proposed Schedule Slots）の管理と複数社横断ブッキング防止方針 | 承認 (Accepted) | 2026-10-18 |
| [ADR-0011](./0011-cloud-run-direct-iap-and-defense-in-depth-jwt-verification.md) | Google Cloud 最小構成（Cloud Run Direct IAP + Cloud SQL）と IAP JWT による多層防御認証方針 | 承認 (Accepted) | 2026-10-18 |
| [ADR-0012](./0012-in-process-cqrs-transactional-outbox-and-sse-synchronization.md) | 単一コンテナ完結型 In-Process CQRS、Transactional Outbox、および SSE リアルタイム同期方針 | 承認 (Accepted) | 2026-10-18 |
