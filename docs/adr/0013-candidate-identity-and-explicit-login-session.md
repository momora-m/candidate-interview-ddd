# ADR-0013: IAP 検証済み Identity からの明示的ログインと候補者（CandidateId）単位のデータ分離方針

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-20

## コンテキスト (Context)
[ADR-0011](./0011-cloud-run-direct-iap-and-defense-in-depth-jwt-verification.md) にて、Cloud Run Direct IAP とバックエンドでの IAP JWT（`X-Goog-IAP-JWT-Assertion`）署名検証によるゼロトラスト認証を採用した。

しかし、これまでのドメインモデルおよび永続化スキーマには「どの候補者（ユーザー）のデータか」を表す概念（`Candidate` / `CandidateId`）が存在せず、以下の課題があった：
1. **境界の曖昧さ（インフラ認証とアプリ状態の混同）**:
   - IAP を通過して JWT が検証できたこと（ネットワーク・身元の正当性確認）と、アプリケーション上で「その候補者として利用を開始した（ログイン状態である）」ことが区別されていなかった。
2. **ドメイン上の所有者の不在**:
   - `TargetCompany` や `JobApplication`、および日程重複を判定する `CandidateScheduleConflictDomainService` において、「同一の候補者（`CandidateId`）に属するスケジュール同士の衝突を防ぐ」というドメインの主語がコード上で明示されていなかった。
3. **検証済みクレームの未活用**:
   - IAP JWT から暗号学的に取り出した一意な識別子（`sub` および `email`）を、単なるアクセス許可チェックのみで捨てており、ドメインモデルおよびリードモデル・SSE ストリームのテナント境界として活用できていなかった。

## 決定事項 (Decision)
**「IAP JWT 検証による Identity 抽出（第1関門）」** と **「ユーザーの明示的なログイン操作によるアプリセッション確立（第2関門）」** を分離し、すべての集約・リードモデル・イベントを **`CandidateId`** 単位でスコープ分離する。

```text
[ Cloud IAP / Request ]
   │  X-Goog-IAP-JWT-Assertion (ES256 署名検証)
   ▼
[ 第1関門: Verified IAP Identity ] (sub, email を抽出 / 未ログインでも到達可)
   │
   │  POST /api/auth/login（画面上の明示的ログイン操作）
   ▼
[ 第2関門: Candidate Session ] (Candidate エンティティ特定・プロビジョニング + HttpOnly Session)
   │
   ▼
[ Domain / CQRS / SSE ] (すべての Read / Write / Stream を CandidateId で分離)
```

### 1. 二段階の認証・セッションライフサイクル
1. **第1関門：IAP Identity 検証ミドルウェア**:
   - リクエストヘッダー `X-Goog-IAP-JWT-Assertion` を ES256 公開鍵・`aud`・`iss` で検証し、`VerifiedIdentity`（`iapSubject`, `email`）をコンテキストへ格納する。
   - ローカル開発および自動テスト環境では、開発用のモック Identity プロバイダ（環境変数またはテストヘッダー）から同じ `VerifiedIdentity` 型を注入する。
2. **第2関門：候補者本人による明示的ログインとセッション確立**:
   - IAP を通過した直後の状態では、まだアプリケーションのログインセッションは開始しない。
   - クライアントは `GET /api/auth/me` で「IAP 検証済みアカウント情報（`email`）」と「アプリのログイン状態（`authenticated: boolean`）」を取得し、未ログイン時はウェルカム（ログイン確認）画面を表示する。
   - ユーザーが明示的に「このアカウントでログインする」を実行（`POST /api/auth/login`）した時点で、該当ユーザーの `Candidate` を特定（初回ログイン時は自動登録）し、署名付き HttpOnly Cookie セッションを発行する。
   - `POST /api/auth/logout` により、IAP 配下であってもアプリケーション単位で明示的にログアウトできる。

### 2. ドメイン層における `Candidate` / `CandidateId` の導入
- **`CandidateId` 値オブジェクト**:
  - 候補者を一意に識別する値オブジェクトを導入する（IAP の `sub` クレームまたは確定的な内部 ID に紐づく）。
- **集約ルートの所有権の明示**:
  - `TargetCompany` および `JobApplication` は必須属性として `candidateId: CandidateId` を保持する。
- **ドメインサービスとユースケースのスコープ**:
  - `CandidateScheduleConflictDomainService` や各ユースケースは、ログイン中の `CandidateId` に属する応募・面接日程のみを対象に不変条件（移動バッファ・二重予約防止）を評価する。

### 3. 永続化・CQRS リードモデル・SSE の候補者単位分離
- **Write Model / Outbox**:
  - `target_companies`、`job_applications`、`domain_events` テーブルに `candidate_id` カラム（および複合インデックス）を持たせ、他候補者のデータと混在しない構造とする。
- **Read Model (`read_model_companies`, `read_model_applications`)**:
  - クエリサービス（`CandidateQueryService`）は常に `CandidateId` を受け取り、`WHERE candidate_id = $1` で単一候補者のリードモデルのみを返却する。
- **SSE ストリーム (`GET /api/events/stream`)**:
  - イベント配信時にもイベントの `candidateId` と接続中セッションの `CandidateId` を照合し、本人のドメインイベントのみをプッシュする。

## 影響とトレードオフ (Consequences)
- **メリット**:
  - **ユビキタス言語とモデルの整合**: 「候補者（`Candidate`）が自身の選考とスケジュールを管理する」という [ADR-0001](./0001-candidate-centric-domain-modeling.md) の理念が、コード上の型（`CandidateId`）として一貫して表現される。
  - **セキュリティと UX の明確化**: インフラ層の透過的なプロキシ認証（IAP）と、アプリ層の明示的なログイン／ログアウト体験が分離され、現在どのアカウントとして操作しているかが画面上で一目瞭然になる。
  - **マルチアカウント・デモ環境への自然な対応**: 本番アカウントと検証用アカウントを同一環境で安全に分離できる。
- **トレードオフ**:
  - すべてのユースケース・クエリ・リポジトリメソッドの引数（または実行コンテキスト）に `CandidateId` を引き回す変更が必要となる。
