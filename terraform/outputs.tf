output "cloud_run_url" {
  description = "Cloud Run サービスのエンドポイント URL"
  value       = google_cloud_run_v2_service.default.uri
}

output "cloud_sql_instance_name" {
  description = "Cloud SQL インスタンス名"
  value       = google_sql_database_instance.default.name
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL インスタンスの接続名（project:region:instance）"
  value       = google_sql_database_instance.default.connection_name
}

output "db_user" {
  description = "データベースユーザー名"
  value       = google_sql_user.default.name
}

output "db_name" {
  description = "データベース名"
  value       = google_sql_database.default.name
}

output "secret_manager_db_password_id" {
  description = "DB パスワードが保管された Secret Manager Secret ID"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "service_account_email" {
  description = "Cloud Run に割り当てられたサービスアカウントのメールアドレス"
  value       = google_service_account.cloud_run.email
}
