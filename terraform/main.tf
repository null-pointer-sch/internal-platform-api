terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Artifact Registry via GitHub Module
module "artifact_repo" {
  source = "git::https://github.com/null-pointer-sch/cicd-templates.git//modules/google-artifact-registry?ref=v1.0.0"

  region        = var.region
  repository_id = var.artifact_repo_id
  description   = "Repo for internal-platform-api images"
}

import {
  to = module.artifact_repo.google_artifact_registry_repository.repo
  id = "projects/internal-platform-api/locations/europe-west1/repositories/internal-platform-api-eu"
}

import {
  to = module.api.google_cloud_run_v2_service.service
  id = "projects/internal-platform-api/locations/europe-west1/services/internal-platform-api"
}

# Cloud Run via GitHub Module
module "api" {
  source = "git::https://github.com/null-pointer-sch/cicd-templates.git//modules/google-cloud-run?ref=v1.0.0"

  region         = var.region
  service_name   = "internal-platform-api"
  image          = "${var.region}-docker.pkg.dev/${var.project_id}/${module.artifact_repo.repository_id}/internal-platform-api:${var.image_tag}"
  container_port = 8000
  is_public      = true

  env_vars = {
    DATABASE_URL = var.database_url
  }

  cpu_limit          = "1"
  memory_limit       = "512Mi"
  min_instance_count = 0
  max_instance_count = 10
}

output "cloud_run_url" {
  value = module.api.service_url
}