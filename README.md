# Candidate DDD Platform (面接日程・選考ナレッジ管理プラットフォーム)

> 転職・就職活動において、候補者（応募者自身）が複数企業の選考プロセス、面接日程、逆質問スナップショット、および事前・事後タスク（TODO）を管理するための**過剰設計（Over-Engineered）なドメイン駆動設計（DDD）アプリケーション**です。

---

## 1. ドメインアーキテクチャ概要 (Architecture & Layers)

本リポジトリは、UIフレームワークや永続化層（Google Cloud / RDB）からドメインロジックを完全に分離したオニオンアーキテクチャ（ヘキサゴナルアーキテクチャ）を採用しています。

```
[ Domain Layer (Pure TypeScript / No External Dependencies) ]
    ├── Shared Kernel (Result Monad, ValueObject, Entity, AggregateRoot, DomainEvent)
    ├── TargetCompany Aggregate (CompanyId, BusinessModel VO, TechStackProfile VO, StockedReverseQuestion VO)
    ├── JobApplication Aggregate (ApplicationId, PositionDetails VO, PositionMotivation VO, SelectionStage VO)
    │     ├── InterviewSession (Internal Entity: TimeWindow VO, InterviewFormat VO, AssignedReverseQuestion VO, InterviewReflection VO)
    │     └── PreparationTodo (Internal Entity: TaskType VO, TaskStatus VO, TaskPriority VO)
    ├── Domain Services (CandidateScheduleConflictDomainService with Travel Buffers)
    └── Repositories / Ports (ITargetCompanyRepository, IJobApplicationRepository)

[ Application Layer ]
    ├── Use Cases (ScheduleInterview, RecordReflection, AssignQuestion, AdvanceStage, etc.)
    ├── Event Bus Port & In-Memory Dispatcher (IEventBus / InMemoryEventBus)
    └── DTOs & Mappers

[ Infrastructure / Persistence ]
    ├── PostgreSQL schema (db/migrations/001_initial.sql)
    └── PostgresTargetCompanyRepository / PostgresJobApplicationRepository
          └── 集約保存時に子行をトランザクション内で全削除・再挿入 (ADR-0006)

[ HTTP API ]
    └── Hono + Zod（ユースケースをそのまま呼ぶ。ORM は使わない）

[ Presentation Layer ]
    └── React 19 + Vite 6 + Tailwind CSS SPA
```

---

## 2. ユビキタス言語と値オブジェクト（Value Objects）の設計

| 概念 | 分類 | 責務・不変条件（Invariants） |
| :--- | :--- | :--- |
| **`TargetCompany`** | 集約ルート | 志望企業の基本情報、事業モデル、技術スタック、および全社逆質問プールを管理する独立集約。 |
| **`JobApplication`** | 集約ルート | ポジション固有の志望動機、選考パイプライン、面接日程、および事前準備TODOのトランザクション境界。 |
| **`TimeWindow`** | 値オブジェクト | 開始時刻 < 終了時刻（15分〜360分）の保証。他社面接との直接重複判定、および移動・準備バッファを考慮した過密判定アルゴリズムをカプセル化。 |
| **`InterviewFormat`** | 値オブジェクト | オンライン（`MeetingUrl`）と対面（オフィス・会議室・片道移動見込時間）の判別共用体。形式に応じた必要移動バッファ（10分 vs 45分等）を提供。 |
| **`StockedReverseQuestion`** | 値オブジェクト | 企業マスターにストックされる「逆質問の型」。対象面接官（現場/EM/役員/人事）と検証仮説（Intent）を持つ。 |
| **`AssignedReverseQuestion`** | 値オブジェクト | **マスターから面接セッションにディープコピーされた不変スナップショット**。面接文脈に応じた文面カスタマイズ、得られた回答メモ、納得度スコア（1〜5）を保持。 |
| **`InterviewReflection`** | 値オブジェクト | 面接直後に記録する自己パフォーマンス評価、企業印象スコア、得られた知見、懸念点、次回アクションの不変セット。 |
| **`SelectionStage`** | 値オブジェクト | 書類選考、一次、二次、最終、オファー等の有限状態遷移ルール。面接振り返りが未入力の場合は次ステージへの昇格を拒否。 |

---

## 3. 主な機能とドメインの振る舞い

1. **面接確定時のタスク自動導出（Auto-Generated Preparation Flow）**:
   - 面接日程が確定すると、選考フェーズに応じた「企業リサーチ」「逆質問選定」「面接本番」「振り返り記録」「お礼送付」タスクが自動生成されます。
2. **逆質問のイミュータブル・スナップショット（Immutable Question Copy）**:
   - 企業マスターの逆質問を変更・削除しても、過去の面接で質問した文脈・回答履歴が破壊されません。
3. **移動時間・準備バッファを考慮したスケジュール衝突検知（Travel Buffer Collision Detection）**:
   - 単なる時間の重なりだけでなく、「対面面接の移動45分」を考慮した物理的に移動不可能な過密スケジュールをリアルタイムに検知・警告します。
4. **イベント駆動アーキテクチャ（Domain Event Bus）**:
   - すべての集約状態変更（面接予約、逆質問アサイン、振り返り記録、ステージ昇格）はドメインイベントを発行し、イベントストリームでリアルタイムに追跡できます。

---

## 5. アーキテクチャ決定記録 (ADR)

設計上の重要判断、背景、およびトレードオフは `docs/adr/` に Architecture Decision Records として文書化されています。

- [ADR-0001: 候補者（求職者自身）視点でのドメインモデリングへの転換](docs/adr/0001-candidate-centric-domain-modeling.md)
- [ADR-0002: 志望企業（TargetCompany）と選考応募（JobApplication）の集約境界分離](docs/adr/0002-separate-target-company-and-job-application-aggregates.md)
- [ADR-0003: 志望動機（PositionMotivation）の JobApplication 集約への配置](docs/adr/0003-placement-of-position-motivation-in-job-application.md)
- [ADR-0004: 逆質問の面接割当における「不変スナップショットコピー（VO）」方式の採用](docs/adr/0004-reverse-questions-as-immutable-vo-snapshot-copy.md)
- [ADR-0005: 移動・準備バッファ（Travel Buffer）を考慮した日程重複・過密判定アルゴリズム](docs/adr/0005-travel-and-prep-buffers-in-schedule-conflict-detection.md)
- [ADR-0006: RDB（PostgreSQL）永続化と子エンティティのトランザクション内全削除・一括再挿入方針](docs/adr/0006-rdb-persistence-with-transactional-full-replace-for-child-entities.md)
- [ADR-0007: 外部非依存の純粋 TypeScript ドメイン層、Result 型エラーハンドリング、およびドメインイベントバス](docs/adr/0007-pure-typescript-domain-with-result-type-and-event-bus.md)
- [ADR-0008: Schema-First (OpenAPI 3.1) アプローチと openapi-typescript による型自動生成](docs/adr/0008-schema-first-openapi-and-code-generation.md)

詳細は [docs/adr/README.md](docs/adr/README.md) を参照してください。

---

## 6. OpenAPI 仕様書と型自動生成 (Schema-First)

API のインターフェースは `docs/openapi/openapi.yaml` を単一の信頼できる情報源（Single Source of Truth）として定義しています。

### OpenAPI からの TypeScript 型自動生成
```bash
npm run generate:types
```
`src/api/generated/schema.d.ts` および `src/api/generated/types.ts` に、リクエストボディ・レスポンス・ドメインDTOの完全な型定義が自動生成されます。

### Swagger UI による対話ドキュメント閲覧
API サーバーを起動（`npm run api`）後、以下のURLにアクセスすると Swagger UI を利用できます：
- **Swagger UI**: `http://localhost:4317/docs`
- **OpenAPI 3.1 仕様書 (YAML)**: `http://localhost:4317/openapi.yaml`

---

## 6. ローカル起動とテスト実行方法

### 依存関係のインストール
```bash
npm install
```

### 依存関係の脆弱性スキャン
`next` は Vite へ移行した後も残っていたため外しました。スキャンはロックファイルに対する `npm audit` と、レジストリ署名の `npm audit signatures` です。

```bash
npm install -g npm@11.10.0
npm run security:check
```

`.npmrc` の `min-release-age=7` は、新規に解決するパッケージを公開から 7 日経つまで入れない設定です。npm 11.10.0 以降で有効になります。既存の `package-lock.json` を `npm ci` で入れるときは、ロック済みの版をそのまま使います。Dependabot も同じ 7 日の cooldown で更新します。毎週のスキャンは `.github/workflows/npm-audit.yml` です。

### 単体テストの実行 (tsx test runner)
```bash
npm test
```
ドメイン・ユースケースに加え、PostgreSQL リポジトリの統合テストも実行します。テスト用データベースはプロセス内の PGlite なので、Docker や接続文字列は不要です。pull request と `main` への push では `.github/workflows/test.yml` が `npm run build` と `npm test` を実行します。GitHub の Public リポジトリではこの実行時間は無料です。

### PostgreSQL（任意）
ローカルの PostgreSQL 16 を使う場合:

```bash
docker compose up -d
DATABASE_URL=postgres://candidate:candidate@localhost:54329/candidate_interview npm run db:migrate
```

`npm run db:migrate` は `db/migrations/001_initial.sql` を適用します。画面のプロトタイプは引き続きインメモリリポジトリを使います。

### API サーバー (Hono)
```bash
npm run api
```
`DATABASE_URL` が無いときはインメモリリポジトリで起動し、画面と同じ初期データを投入します。接続文字列があるときは PostgreSQL リポジトリを使います。

```bash
DATABASE_URL=postgres://candidate:candidate@localhost:54329/candidate_interview npm run api
```

待受は `http://127.0.0.1:4317` です。`GET /health` で起動確認できます。リクエストの形は Zod が検査し、ドメインルール違反はユースケースの `Result` を 400 / 404 / 409 に変換します。

型だけ共有するクライアントの例:

```ts
import { hc } from 'hono/client';
import type { AppType } from './src/api/app';

const client = hc<AppType>('http://127.0.0.1:4317');
const companies = await client.api.companies.$get();
```

### 開発サーバーの起動 (Vite)
```bash
npm run dev
```
ブラウザで `http://localhost:3847` を開くと、DDDプラットフォームのUIが表示されます。

### プロダクションビルド
```bash
npm run build
```
