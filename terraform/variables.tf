variable "project_id" {
  description = "Google Cloud プロジェクト ID"
  type        = string
}

variable "region" {
  description = "リソースをデプロイする GCP リージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "app_name" {
  description = "アプリケーション名（リソースの接頭辞に使用）"
  type        = string
  default     = "candidate-interview"
}

variable "db_name" {
  description = "PostgreSQL データベース名"
  type        = string
  default     = "candidate_interview"
}

variable "db_user" {
  description = "Cloud SQL アプリケーション用ユーザー名"
  type        = string
  default     = "candidate_app"
}

variable "allowed_user_email" {
  description = "IAP アクセスおよび JWT 検証を許可する Google アカウントのメールアドレス"
  type        = string
}

variable "container_image" {
  description = "Cloud Run にデプロイするコンテナイメージ URL（Artifact Registry 等）"
  type        = string
  default     = "gcr.io/cloudrun/placeholder"
}

variable "iap_audience" {
  description = "Cloud IAP の JWT Audience（省略時は Cloud Run サービス情報等から組み立て、またはデプロイ後に設定）"
  type        = string
  default     = ""
}

variable "cloud_sql_deletion_protection" {
  description = "Cloud SQL インスタンスの削除保護（個人利用の最小コスト構成では再作成容易性のためデフォルト false）"
  type        = bool
  default     = false
}
