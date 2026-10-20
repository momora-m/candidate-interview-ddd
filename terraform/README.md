# Candidate DDD Platform - Google Cloud 本番インフラ運用ガイド (Terraform & 手動設定)

本ディレクトリには、[ADR-0011](../docs/adr/0011-cloud-run-direct-iap-and-defense-in-depth-jwt-verification.md) に基づく **Google Cloud 最小構成インフラ（Cloud Run + Cloud SQL + Secret Manager + Cloud IAP）** の Terraform 定義と、**Terraform 外で必要となる初回セットアップ・運用手順** をまとめています。

---

## 1. インフラ全体像とセキュリティ設計

```text
[ ユーザー (Google 認証済みアカウント) ]
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
[ Cloud SQL for PostgreSQL 16 (db-f1-micro / Enterprise Edition) ]
  ├── Public IP (Authorized Networks: 空 / 外部からの直接接続は完全遮断)
  └── IAM 認証 + mTLS 暗号化トンネル (Secret Manager 経由でパスワード自動注入)
```

### 機密情報の保護方針
- **DB パスワード**: `random_password` で 24 桁のランダム文字列を生成し、Google Cloud **Secret Manager** に直接保存。設定ファイルや Git コミットには一切平文を残しません。
- **Git 除外ファイル**: `.gitignore` により、`terraform.tfvars`, `*.tfvars.json`, `*.tfstate`, `.terraform/`, `.env*` はリポジトリから完全に除外されます。

---

## 2. デプロイ全体の流れ (実行順序)

Terraform を実行する前に、**コンテナイメージの準備** や **OAuth 認証画面の初期設定** が必要です。

```text
【Step 0】gcloud CLI の初期認証とプロジェクト設定
   │
【Step 1】Artifact Registry リポジトリの作成 & 初回 Docker イメージの Push
   │     ※ Startup Probe (/health) を通すため、Terraform 適用前に実イメージを Push します
   │
【Step 2】OAuth 2.0 同意画面 & クライアント ID の作成 (GCP コンソール)
   │     ※ 組織なし (個人 Gmail) プロジェクトで IAP を動かすための必須要件
   │
【Step 3】IAP へのカスタム OAuth クライアントの紐付け (gcloud iap settings)
   │
【Step 4】Terraform によるインフラ一括構築 (terraform apply)
   │     ※ Cloud SQL (10〜15分), Secret Manager, Cloud Run, IAM 権限を自動構築
   │
【Step 5】ブラウザからの接続・動作確認
```

---

## 3. Terraform 外で必要な事前・初回セットアップ手順

OS ごとにコマンドタブを切り替えて実行してください。

### Step 0: gcloud CLI の初期認証

<details open>
<summary><b>PowerShell (Windows)</b></summary>

```powershell
$PROJECT_ID = "your-gcp-project-id"
$REGION     = "asia-northeast1"
$APP_NAME   = "candidate-interview"
$MY_EMAIL   = "your-email@example.com"

# 1. Google Cloud ログイン
gcloud auth login
gcloud auth application-default login

# 2. プロジェクトの選択と Quota Project の同期
gcloud config set project $PROJECT_ID
gcloud auth application-default set-quota-project $PROJECT_ID
```
</details>

<details>
<summary><b>Bash (macOS / Linux)</b></summary>

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="asia-northeast1"
export APP_NAME="candidate-interview"
export MY_EMAIL="your-email@example.com"

# 1. Google Cloud ログイン
gcloud auth login
gcloud auth application-default login

# 2. プロジェクトの選択と Quota Project の同期
gcloud config set project $PROJECT_ID
gcloud auth application-default set-quota-project $PROJECT_ID
```
</details>

---

### Step 1: Artifact Registry の作成 & 初回 Docker イメージ Push

Cloud Run の起動ヘルスチェック（Startup Probe: `/health`）を成功させるため、**Terraform 実行前に本番イメージを Push しておく必要があります**。

<details open>
<summary><b>PowerShell (Windows)</b></summary>

```powershell
# 1. 必要な API の有効化
gcloud services enable `
  artifactregistry.googleapis.com `
  run.googleapis.com `
  sqladmin.googleapis.com `
  secretmanager.googleapis.com `
  iap.googleapis.com

# 2. Artifact Registry リポジトリの作成
gcloud artifacts repositories create $APP_NAME `
  --repository-format=docker `
  --location=$REGION `
  --description="Candidate Interview App Docker repository"

# 3. Docker 認証を通す
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

# 4. リポジトリのルートフォルダでイメージをビルド & Push
$IMAGE_TAG = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}/app:latest"
docker build --target production -t $IMAGE_TAG .
docker push $IMAGE_TAG
```
</details>

<details>
<summary><b>Bash (macOS / Linux)</b></summary>

```bash
# 1. 必要な API の有効化
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  iap.googleapis.com

# 2. Artifact Registry リポジトリの作成
gcloud artifacts repositories create $APP_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Candidate Interview App Docker repository"

# 3. Docker 認証を通す
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

# 4. リポジトリのルートフォルダでイメージをビルド & Push
export IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}/app:latest"
docker build --target production -t $IMAGE_TAG .
docker push $IMAGE_TAG
```
</details>

---

### Step 2: OAuth 2.0 同意画面 & クライアント ID の作成 (GCP コンソール)

> 💡 **なぜこの手順が必要か？**  
> Google Cloud の仕様上、Google Workspace 組織外のプロジェクト（個人の `@gmail.com` アカウントなど）で IAP を使用する場合、Google 管理のデフォルト OAuth クライアントが使えないため、**カスタム OAuth クライアントの作成が必須** です（未設定だと `Empty Google Account OAuth client ID(s)/secret(s)` エラーになります）。

1. [Google Cloud コンソール > OAuth 同意画面](https://console.cloud.google.com/apis/credentials/consent) を開く。
2. **同意画面の作成**:
   - **アプリ名**: `Candidate Interview`（任意）
   - **ユーザーサポートメール / 連絡先**: ご自身のメールアドレス
   - **User Type**: **「外部 (External)」** を選択
3. **テストユーザーの登録 (重要)**:
   - 「テストユーザー」欄で **「+ Add Users」** を押し、ご自身の Google アカウントのメールアドレスを追加して保存。
4. **OAuth 2.0 クライアント ID の作成**:
   - [認証情報 (Credentials)](https://console.cloud.google.com/apis/credentials) 画面を開く。
   - **「＋ 認証情報を作成」** ➔ **「OAuth クライアント ID」** をクリック。
   - **アプリケーションの種類**: **`ウェブ アプリケーション`**
   - **名前**: `IAP Client`
   - 「作成」を押し、表示される **「クライアント ID」** と **「クライアント シークレット」** を控える。
5. **リダイレクト URI の登録**:
   - 作成した `IAP Client` の編集画面を開き、「承認済みのリダイレクト URI」に以下を追加して保存：
     ```text
     https://iap.googleapis.com/v1/oauth/clientIds/【あなたのクライアントID】:handleRedirect
     ```

---

### Step 3: IAP へのカスタム OAuth クライアントの紐付け

作成した OAuth クライアントの情報を IAP に登録します。

<details open>
<summary><b>PowerShell (Windows)</b></summary>

```powershell
$CLIENT_ID     = "あなたのクライアントID"
$CLIENT_SECRET = "あなたのクライアントシークレット"

# 一時設定ファイルを生成して IAP に反映
@"
access_settings:
  oauth_settings:
    client_id: $CLIENT_ID
    client_secret: $CLIENT_SECRET
"@ | Out-File -FilePath iap_settings.yaml -Encoding utf8

gcloud iap settings set iap_settings.yaml --project=$PROJECT_ID

# 用済みの一時ファイルを削除
Remove-Item iap_settings.yaml
```
</details>

<details>
<summary><b>Bash (macOS / Linux)</b></summary>

```bash
export CLIENT_ID="あなたのクライアントID"
export CLIENT_SECRET="あなたのクライアントシークレット"

cat <<EOF > iap_settings.yaml
access_settings:
  oauth_settings:
    client_id: $CLIENT_ID
    client_secret: $CLIENT_SECRET
EOF

gcloud iap settings set iap_settings.yaml --project=$PROJECT_ID

rm -f iap_settings.yaml
```
</details>

---

## 4. Terraform によるインフラ構築

### Step 4-1: 設定ファイル (`terraform.tfvars`) の作成

`terraform` ディレクトリに移動し、設定ファイルを作成します。

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Windows PowerShell の場合: Copy-Item terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を開き、実際の値を設定します：

```hcl
project_id         = "your-gcp-project-id"
region             = "asia-northeast1"
app_name           = "candidate-interview"
allowed_user_email = "your-email@example.com"
container_image    = "asia-northeast1-docker.pkg.dev/your-gcp-project-id/candidate-interview/app:latest"

# 省略時は Terraform がプロジェクト番号から自動計算します
iap_audience       = ""
```

---

### Step 4-2: Terraform の実行

```bash
# 1. 初期化
terraform init

# 2. 計画の確認
terraform plan

# 3. リソースの一括構築
terraform apply
```

> ⏳ **所要時間**: Cloud SQL (`db-f1-micro`) のプロビジョニングに **約10〜15分** かかります。  
> 完了すると、Cloud Run URL や接続情報がコンソールに出力されます。

---

## 5. 動作確認

1. Terraform 出力の `cloud_run_url`（または GCP コンソール上の Cloud Run URL）をブラウザで開きます。
2. **Google ログイン画面** が表示されたら、`allowed_user_email` に指定した Google アカウントでログインします。
3. **Candidate DDD プラットフォームの画面** が表示されれば本番稼働完了です！

---

## 🔄 2回目以降のアプリケーション更新デプロイ

機能追加やバグ修正後の通常デプロイは、**Docker ビルド＆Push と Cloud Run 更新のみ（約30秒〜1分）** で完了します（Terraform を再実行する必要はありません）。

<details open>
<summary><b>PowerShell (Windows)</b></summary>

```powershell
$IMAGE_TAG = "asia-northeast1-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}/app:latest"

# 1. 本番イメージのビルド & Push
docker build --target production -t $IMAGE_TAG .
docker push $IMAGE_TAG

# 2. Cloud Run サービスの最新イメージ再デプロイ
gcloud run deploy $APP_NAME `
  --image=$IMAGE_TAG `
  --region=asia-northeast1
```
</details>

<details>
<summary><b>Bash (macOS / Linux)</b></summary>

```bash
export IMAGE_TAG="asia-northeast1-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}/app:latest"

# 1. 本番イメージのビルド & Push
docker build --target production -t $IMAGE_TAG .
docker push $IMAGE_TAG

# 2. Cloud Run サービスの最新イメージ再デプロイ
gcloud run deploy $APP_NAME \
  --image=$IMAGE_TAG \
  --region=asia-northeast1
```
</details>

---

## 🛠️ トラブルシューティング

| 現象・エラーメッセージ | 原因 | 対処法 |
| :--- | :--- | :--- |
| **`Empty Google Account OAuth client ID(s)/secret(s).`** | 組織なしプロジェクトで IAP にカスタム OAuth クライアントが未登録 | [Step 2] と [Step 3] を実行して `gcloud iap settings set` で登録する |
| **`403 Forbidden: Your client does not have permission...`** | IAP サービスアカウントへの `run.invoker` 権限不足、またはユーザーへの IAP 権限未伝播 | `terraform apply` を実行して IAM 権限を同期し、1〜2分待ってシークレットウィンドウで再アクセスする |
| **`{"error":"認証トークンが無効です。"}`** | アプリ側の JWT 検証 Audience 不一致 | `main.tf` の自動計算（`/projects/PROJECT_NUMBER/locations/REGION/services/SERVICE_NAME`）を適用するため `terraform apply` を実行する |
| **`The user-provided container failed the configured startup probe checks`** | プレースホルダー等の `/health` を持たないイメージで Cloud Run が起動した | [Step 1] の手順でビルドした本番 Docker イメージを AR に Push してから `terraform apply` を行う |
| **`cannot destroy service without setting deletion_protection=false`** | 過去の作成失敗した Cloud Run の削除保護 | `terraform state rm google_cloud_run_v2_service.default` 実行後に `gcloud run services delete` で手動削除して再 `apply` |
| **`Invalid Tier (db-f1-micro) for (ENTERPRISE_PLUS)`** | Cloud SQL のエディションがデフォルトで Plus になった | `settings` ブロック内に `edition = "ENTERPRISE"` を明示する |
