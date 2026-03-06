from uuid import UUID
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
from app.core.exceptions import ResourceNotFoundException

from app.models.environment import Environment
from app.schemas.environment import EnvironmentCreate
from app.services import projects as projects_service
import app.repositories.environments as environments_repo
from app.services.provisioning import provision_environment
from app.core.database import SessionLocal


def create_environment_for_project(
    db: Session,
    project_id: UUID,
    env_in: EnvironmentCreate,
    user_id: UUID,
    background_tasks: BackgroundTasks,
) -> Environment:
    project = projects_service.get_project_by_id_for_user(db, project_id, user_id)

    env = Environment(
        project_id=project.id,
        name=env_in.name,
        type=env_in.type,
        status="provisioning",
        config=env_in.config,
    )

    if env_in.type == "ephemeral" and env_in.ttl_hours:
        env.expires_at = datetime.now(timezone.utc) + timedelta(hours=env_in.ttl_hours)

    env = environments_repo.create_environment(db, env)

    # fake background provisioning
    background_tasks.add_task(provision_environment, env.id, SessionLocal)

    return env


def get_environments_for_project(
    db: Session, project_id: UUID, user_id: UUID
) -> list[Environment]:
    projects_service.get_project_by_id_for_user(db, project_id, user_id)
    return environments_repo.get_environments_for_project(db, project_id)


def get_environment_by_id_for_user(
    db: Session, env_id: UUID, user_id: UUID
) -> Environment:
    env = environments_repo.get_environment_by_id(db, env_id)
    if not env:
        raise ResourceNotFoundException(detail="Environment not found")

    # verify ownership via project
    try:
        projects_service.get_project_by_id_for_user(db, env.project_id, user_id)
    except ResourceNotFoundException:
        raise ResourceNotFoundException(detail="Environment not found")

    return env


def delete_environment_for_user(db: Session, env_id: UUID, user_id: UUID):
    env = get_environment_by_id_for_user(db, env_id, user_id)
    environments_repo.delete_environment(db, env)
