import time
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.exceptions import ResourceNotFoundException, InvalidOperationException
from app.models.deployment import Deployment
from app.schemas.deployment import DeploymentCreate
from app.services import environments as environments_service
import app.repositories.deployments as deployments_repo
import app.repositories.environments as environments_repo


def run_deployment(deployment_id, db_factory=SessionLocal):
    db: Session = db_factory()
    try:
        dep = deployments_repo.get_deployment_by_id(db, deployment_id)
        if not dep:
            return

        env = environments_repo.get_environment_by_id(db, dep.environment_id)
        if not env:
            dep.status = "failed"
            deployments_repo.save_deployment(db, dep)
            return

        # Simulate "deploying"
        dep.status = "running"
        deployments_repo.save_deployment(db, dep)

        time.sleep(2)

        # In real life: helm upgrade / kubectl apply / etc.
        dep.status = "succeeded"
        dep.logs_url = f"https://logs.envctl.local/deployments/{dep.id}"
        deployments_repo.save_deployment(db, dep)

    finally:
        db.close()


def create_deployment(
    db: Session,
    background_tasks: BackgroundTasks,
    env_id: UUID,
    dep_in: DeploymentCreate,
    user_id: UUID,
) -> Deployment:
    env = environments_service.get_environment_by_id_for_user(db, env_id, user_id)

    if env.status != "running":
        raise InvalidOperationException(
            detail=f"Environment is not ready (status={env.status})"
        )

    dep = Deployment(
        environment_id=env.id,
        version=dep_in.version,
        status="pending",
    )

    dep = deployments_repo.create_deployment(db, dep)

    background_tasks.add_task(run_deployment, dep.id, SessionLocal)

    return dep


def list_deployments(db: Session, env_id: UUID, user_id: UUID) -> list[Deployment]:
    environments_service.get_environment_by_id_for_user(db, env_id, user_id)
    return deployments_repo.list_deployments_by_environment(db, env_id)


def get_deployment_by_id(db: Session, deployment_id: UUID, user_id: UUID) -> Deployment:
    dep = deployments_repo.get_deployment_by_id(db, deployment_id)
    if not dep:
        raise ResourceNotFoundException(detail="Deployment not found")

    # verify env → project → owner
    try:
        environments_service.get_environment_by_id_for_user(db, dep.environment_id, user_id)
    except ResourceNotFoundException:
        raise ResourceNotFoundException(detail="Deployment not found")

    return dep
