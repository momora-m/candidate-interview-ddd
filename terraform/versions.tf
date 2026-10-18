terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # NOTE: 本番運用時は State ファイル（インフラ状態）を GCS で保護するため、
  # 以下の backend ブロックのコメントアウトを解除し、作成した GCS バケット名を指定してください。
  #
  # backend "gcs" {
  #   bucket = "YOUR_TERRAFORM_STATE_BUCKET_NAME"
  #   prefix = "candidate-interview/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
