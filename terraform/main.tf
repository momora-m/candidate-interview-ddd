# ==========================================
# 1. 必要な Google Cloud API の有効化
# ==========================================
locals {
  services = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "iap.googleapis.com",
    "artifactregistry.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# ==========================================
# 2. Cloud SQL (PostgreSQL 16) - ADR-0011 最小構成
# ==========================================
resource "random_id" "db_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "default" {
  name             = "${var.app_name}-db-${random_id.db_suffix.hex}"
  database_version = "POSTGRES_16"
  region           = var.region
  project          = var.project_id

  deletion_protection = var.cloud_sql_deletion_protection

  settings {
    # 最小インスタンス tier (月額約 $7〜$10)
    edition           = "ENTERPRISE"
    tier              = "db-f1-micro"
    disk_type         = "PD_SSD"
    disk_size         = 10
    disk_autoresize   = false
    availability_type = "ZONAL"

    # Public IP を有効化（ただし authorized_networks を空にすることで 5432 の直接アクセスは拒否）
    # Cloud SQL Auth Proxy / IAM 認証経由のセキュアな mTLS 接続のみを受け付ける
    ip_configuration {
      ipv4_enabled    = true
      ssl_mode        = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
    }

    backup_configuration {
      enabled    = true
      start_time = "04:00"
    }
  }

  depends_on = [google_project_service.apis["sqladmin.googleapis.com"]]
}

resource "google_sql_database" "default" {
  name     = var.db_name
  instance = google_sql_database_instance.default.name
  project  = var.project_id
}

# パスワードをランダム生成（リポジトリや手元に平文パスワードを残さない）
resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "google_sql_user" "default" {
  name     = var.db_user
  instance = google_sql_database_instance.default.name
  password = random_password.db_password.result
  project  = var.project_id
}

# ==========================================
# 3. Secret Manager (DB パスワードを暗号化保管)
# ==========================================
resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.app_name}-db-password"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# ==========================================
# 4. Cloud Run 用 サービスアカウント & IAM 権限
# ==========================================
resource "google_service_account" "cloud_run" {
  account_id   = "${var.app_name}-runner"
  display_name = "Candidate App Cloud Run Runner Service Account"
  project      = var.project_id
}

# Cloud SQL 接続権限（--add-cloudsql-instances / Auth Proxy 用）
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Secret Manager から DB パスワードを取得する権限
resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ==========================================
# 5. Cloud Run v2 サービス (ADR-0011 & ADR-0012)
# ==========================================
resource "google_cloud_run_v2_service" "default" {
  name     = var.app_name
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      # ゼロアイドル課金（アクセスなし時は 0 インスタンス）
      min_instance_count = 0
      # 単一コンテナ CQRS / SSE 整合のため最大 1 インスタンス
      max_instance_count = 1
    }

    # Cloud SQL の Unix ソケットをマウント (/cloudsql/PROJECT:REGION:INSTANCE)
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.default.connection_name]
      }
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      ports {
        container_port = 8080
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.default.connection_name
      }

      env {
        name  = "DB_USER"
        value = google_sql_user.default.name
      }

      env {
        name  = "DB_NAME"
        value = google_sql_database.default.name
      }

      # パスワードは Secret Manager からメモリ上に安全に注入
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "IAP_ALLOWED_EMAIL"
        value = var.allowed_user_email
      }

      env {
        name  = "IAP_AUDIENCE"
        value = var.iap_audience
      }

      startup_probe {
        initial_delay_seconds = 2
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 10
        http_get {
          path = "/health"
          port = 8080
        }
      }

      liveness_probe {
        period_seconds    = 15
        timeout_seconds   = 3
        failure_threshold = 3
        http_get {
          path = "/health"
          port = 8080
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_project_iam_member.cloudsql_client,
    google_secret_manager_secret_iam_member.secret_accessor,
  ]
}

# ==========================================
# 6. IAP & 認証認可アクセス制御
# ==========================================
# Cloud IAP 経由でのアクセス権限を候補者自身（単一ユーザー）のみに付与
resource "google_cloud_run_v2_service_iam_member" "iap_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.default.location
  name     = google_cloud_run_v2_service.default.name
  role     = "roles/run.invoker"
  member   = "user:${var.allowed_user_email}"
}

resource "google_project_iam_member" "iap_accessor" {
  project = var.project_id
  role    = "roles/iap.httpsResourceAccessor"
  member  = "user:${var.allowed_user_email}"
}
