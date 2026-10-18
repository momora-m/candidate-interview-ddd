# ADR-0011: Google Cloud 最小構成（Cloud Run Direct IAP + Cloud SQL）と IAP JWT による多層防御認証方針

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-18

## コンテキスト (Context)
本アプリケーションは候補者自身（単一ユーザー: `candidate@example.com`）が実際の転職活動で利用する本番システムである。
デプロイ先として Google Cloud を採用するにあたり、以下の要件を満たすインフラ・認証設計が求められた：

1. **最小運用コストとゼロアイドル課金**:
   - 個人利用のため、アクセスがない時間帯のインフラコストを極小化する（Cloud Run の `min-instances: 0`、最小 Cloud SQL `db-f1-micro` 構成）。
2. **ロードバランサ（ALB）の排除**:
   - 従来必要とされていた External Application Load Balancer（月額約 $18〜$20）を排し、Cloud Run の Direct IAP 統合を活用して月額 $10 以内（Cloud SQL のみ）に抑える。
3. **多層防御（Defense-in-Depth）とゼロトラスト認証**:
   - IAP によるネットワーク・インフラ層での遮断に加え、アプリケーション層（Hono）でも暗号署名付き JWT を厳格に検証し、平文ヘッダー偽造攻撃（Header Injection）や設定ミスによる不正アクセスを防止する。

## 決定事項 (Decision)
**「React SPA と Hono API を統合した単一 Cloud Run コンテナ + Direct IAP + 暗号学的 JWT 検証」** による最小構成を採用した。

### 1. インフラストラクチャ構成
- **Cloud Run サービス (単一コンテナ)**:
  - Vite でビルドした SPA 静的アセット（`dist/`）と Hono API サーバーを 1 つの Node.js コンテナに同梱。
  - `/api/*`、`/docs`、`/openapi.yaml` 以外のリクエストに対して `index.html`（SPA フォールバック）を同一オリジンで配信。
  - `--add-cloudsql-instances` オプションにより、VPC Connector 不要のセキュアな Unix ドメインソケット経由で Cloud SQL へ接続。
- **Cloud IAP (Identity-Aware Proxy) Direct Integration**:
  - Cloud Run サービスに直接 IAP を有効化し、IAM ポリシーで `user:candidate@example.com` にのみ `roles/iap.httpsResourceAccessor` を付与。
- **Cloud SQL for PostgreSQL**:
  - `db-f1-micro` インスタンス（10GB SSD）にて `db/migrations/001_initial.sql` を永続化。

### 2. アプリケーション層での JWT 検証ミドルウェア（多層防御）
Hono の認証ミドルウェアにおいて、IAP が付与する `X-Goog-IAP-JWT-Assertion` ヘッダーを以下のステップで暗号学的に検証する：
1. **公開鍵署名検証**: Google 公開鍵エンドポイント（JWKS: `https://www.gstatic.com/iap/verify/public_key-jwk`）の鍵セットを用いて ES256 署名を検証。
2. **Audience (`aud`) 検証**: JWT の `aud` クレームが `/projects/PROJECT_NUMBER/apps/PROJECT_ID`（または Cloud Run サービス ID）と完全一致することを確認（リプレイ攻撃防止）。
3. **Issuer (`iss`) & 有効期限 (`exp`) 検証**: `iss === 'https://cloud.google.com/iap'` かつ現在時刻が有効期限内であることを確認。
4. **認可メール照合**: ペイロード内の `email` クレームが許可対象（`candidate@example.com`）と一致することを確認。
5. **環境分離**: `NODE_ENV === 'production'` では JWT 不正または未付与のリクエストを即座に `401 Unauthorized` で遮断。開発・テスト環境では環境変数ベースのモック認証を許可。

## 影響とトレードオフ (Consequences)
- **メリット**:
  - **圧倒的な低コスト**: ロードバランサ等の固定費をゼロにし、月額約 $7〜$10（Cloud SQL 代のみ）でセキュアな本番運用が可能。
  - **高いセキュリティ**: IAP によるインフラ層の防御と、バックエンドでの暗号学的署名検証による二重の保護。
  - **CORS・Cookie 不要**: 同一コンテナ配信により、CORS 設定や複雑な Cookie セッション管理が不要。
- **トレードオフ**:
  - 複数ユーザーへのスケール（マルチテナント化）を行う場合は、将来的にアプリケーション独自のユーザー管理・テナント分離層を追加する必要がある（現フェーズでは単一候補者専用のため YAGNI として除外）。
