from uuid import UUID

from fastapi import APIRouter, Depends, status, BackgroundTasks
from typing import Annotated
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.schemas.environment import EnvironmentCreate, EnvironmentRead
from app.services import environments as environments_service

router = APIRouter(prefix="/environments", tags=["environments"])


@router.post(
    "/projects/{project_id}",
    response_model=EnvironmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_environment_for_project(
    project_id: UUID,
    env_in: EnvironmentCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return environments_service.create_environment_for_project(
        db, project_id, env_in, current_user.id, background_tasks
    )


@router.get("/projects/{project_id}", response_model=list[EnvironmentRead])
def list_environments_for_project(
    project_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return environments_service.get_environments_for_project(
        db, project_id, current_user.id
    )


@router.get("/{env_id}", response_model=EnvironmentRead)
def get_environment(
    env_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return environments_service.get_environment_by_id_for_user(
        db, env_id, current_user.id
    )


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_environment(
    env_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    environments_service.delete_environment_for_user(db, env_id, current_user.id)
