from uuid import UUID

from fastapi import APIRouter, Depends, status, BackgroundTasks
from typing import Annotated
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.schemas.deployment import DeploymentCreate, DeploymentRead
from app.services import deployments as deployments_service
import logging

logger = logging.getLogger("envctl")

router = APIRouter(prefix="/deployments", tags=["deployments"])


@router.post("/environments/{env_id}", response_model=DeploymentRead, status_code=status.HTTP_201_CREATED)
def create_deployment_for_environment(
    env_id: UUID,
    dep_in: DeploymentCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return deployments_service.create_deployment(db, background_tasks, env_id, dep_in, current_user.id)


@router.get("/environments/{env_id}", response_model=list[DeploymentRead])
def list_deployments_for_environment(
    env_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return deployments_service.list_deployments(db, env_id, current_user.id)


@router.get("/{deployment_id}", response_model=DeploymentRead)
def get_deployment(
    deployment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return deployments_service.get_deployment_by_id(db, deployment_id, current_user.id)

@router.get("/{deployment_id}/logs")
def get_deployment_logs(
    deployment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    logger.info(f"Fetching logs for deployment {deployment_id} (user {current_user.id})")
    try:
        dep = deployments_service.get_deployment_by_id(db, deployment_id, current_user.id)
        logger.info(f"Found deployment {deployment_id}, logs length: {len(dep.logs) if dep.logs else 0}, app_logs length: {len(dep.app_logs) if dep.app_logs else 0}")
        return {
            "deployment_logs": dep.logs or "No logs available for this deployment.",
            "app_logs": dep.app_logs or "No app logs available yet..."
        }
    except Exception as e:
        logger.error(f"Error fetching logs for deployment {deployment_id}: {e}")
        raise
