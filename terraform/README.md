# Candidate DDD Platform - Google Cloud 本番インフラ (Terraform)

本ディレクトリには、[ADR-0011](../docs/adr/0011-cloud-run-direct-iap-and-defense-in-depth-jwt-verification.md) に基づく **Google Cloud 最小構成インフラ（Cloud Run + Cloud SQL + Secret Manager + Cloud IAP）** の Terraform 定義が含まれます。

---

## 1. セキュリティと機密情報の保護方針

本リポジトリおよび Git 履歴には、**本番データベースのパスワードや秘密情報が一切含まれません**。

1. **DB パスワードの自動生成と秘匿**:
   - `random_password` リソースが 24 桁のセキュアなパスワードを自動生成します。
   - 生成されたパスワードは Google Cloud の **Secret Manager**（`${app_name}-db-password`）に暗号化されて直接保存されます。
   - 人間や設定ファイル（tfvars 等）がパスワードを平文で扱う必要はありません。
2. **Cloud Run への安全な注入**:
   - Cloud Run は起動時、Google Cloud 基盤経由で Secret Manager から `DB_PASSWORD` 環境変数をメモリ上に直接マウントします。
3. **ローカル機密ファイルの完全除外**:
   - `.gitignore` により、以下のファイルはリポジトリから除外されます：
     - `terraform.tfvars` / `*.tfvars.json`
     - `*.tfstate` / `*.tfstate.backup`
     - `.terraform/`
     - `.env*`

---

## 2. インフラ構成図 (ADR-0011 準拠)

```text
[ ユーザー (candidate@example.com) ]
         │ (Google アカウント認証)
         ▼
[ Google Cloud IAP (Identity-Aware Proxy) ]
         │ (暗号署名付き JWT: X-Goog-IAP-JWT-Assertion)
         ▼
[ Cloud Run (単一コンテナ / 最小コスト) ]
  ├── ① Hono ミドルウェア (IAP JWT 署名 & 許可メールの暗号検証)
  ├── ② Vite SPA 静的配信 (dist/ + index.html SPA フォールバック)
  ├── ③ Hono HTTP API & In-Process CQRS / Outbox
  └── ④ 起動時自動マイグレーション (001_initial.sql / 003_domain_events...)
         │ (Unix ドメインソケット /cloudsql/...)
         ▼
[ Cloud SQL for PostgreSQL (db-f1-micro) ]
  ├── Public IP (Authorized Networks: 空 / 直接接続拒否)
  └── IAM 認証 + mTLS 暗号化トンネル
```

---

## 3. デプロイ手順

### 前提条件
- Google Cloud SDK (`gcloud` CLI) がインストール・認証済みであること
- Terraform (>= 1.5.0) がインストールされていること

```bash
# Google Cloud 認証
gcloud auth login
gcloud auth application-default login
```

### ステップ 1: 設定ファイルの作成
テンプレートから `terraform.tfvars` を作成し、プロジェクト ID などを記入します。

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集:
```hcl
project_id         = "your-gcp-project-id"
allowed_user_email = "candidate@example.com"
```

### ステップ 2: Terraform State バケットの準備（推奨）
複数環境や安全な State 管理のため、Google Cloud Storage (GCS) バケットを作成し、`versions.tf` の `backend "gcs"` ブロックを有効化します。

```bash
# GCS バケット作成例
gcloud storage buckets create gs://your-gcp-project-id-tfstate --location=asia-northeast1
```

### ステップ 3: インフラの初期化と適用
```bash
# 初期化
terraform init

# 変更プランの確認
terraform plan

# インフラの構築
terraform apply
```

---

## 4. コンテナイメージのビルドとデプロイ

単一コンテナの本番イメージ（SPA 静的アセット同梱）をビルドして Artifact Registry に push します。

```bash
# ルートディレクトリで本番イメージをビルド
docker build --target production -t asia-northeast1-docker.pkg.dev/PROJECT_ID/candidate-interview/app:latest .

# Artifact Registry へ push
docker push asia-northeast1-docker.pkg.dev/PROJECT_ID/candidate-interview/app:latest
```

---

## 5. データベースの初期化・マイグレーションについて

- **初回起動時**:
  - Cloud Run が起動すると、アプリケーション内部の `createPostgresPersistence` が自動的に `db/migrations/001_initial.sql` および `003_domain_events_and_read_models.sql` を適用します。
  - 適用済みマイグレーションは `schema_migrations` テーブルに記録され、次回以降の起動時は差分のみが安全に適用されます。
  - 開発用サンプルデータ（`db/seeds/dev.sql`）は本番環境では適用されません。
