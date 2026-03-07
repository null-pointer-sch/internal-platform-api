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
  source = "git::https://github.com/null-pointer-sch/cicd-templates.git//modules/google-artifact-registry?ref=v1.1.0"

  region        = var.region
  repository_id = var.artifact_repo_id
  description   = "Repo for internal-platform-api images"

  writers = [
    "serviceAccount:github-actions-deploy@internal-platform-api.iam.gserviceaccount.com"
  ]
}

# Backend Cloud Run via GitHub Module
module "backend" {
  source = "git::https://github.com/null-pointer-sch/cicd-templates.git//modules/google-cloud-run?ref=v1.0.0"

  region         = var.region
  service_name   = "internal-platform-api-backend"
  image          = "${var.region}-docker.pkg.dev/${var.project_id}/${module.artifact_repo.repository_id}/internal-platform-api-backend:${var.image_tag}"
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

# Frontend Cloud Run via GitHub Module
module "frontend" {
  source = "git::https://github.com/null-pointer-sch/cicd-templates.git//modules/google-cloud-run?ref=v1.0.0"

  region         = var.region
  service_name   = "internal-platform-api-frontend"
  image          = "${var.region}-docker.pkg.dev/${var.project_id}/${module.artifact_repo.repository_id}/internal-platform-api-frontend:${var.image_tag}"
  container_port = 80
  is_public      = true

  cpu_limit          = "1"
  memory_limit       = "256Mi"
  min_instance_count = 0
  max_instance_count = 5
}

output "backend_url" {
  value = module.backend.service_url
}

output "frontend_url" {
  value = module.frontend.service_url
}