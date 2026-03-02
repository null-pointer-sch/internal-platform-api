from uuid import UUID
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db, SessionLocal
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.environment import Environment
from app.schemas.environment import EnvironmentCreate, EnvironmentRead
from app.services.provisioning import provision_environment

router = APIRouter(prefix="/environments", tags=["environments"])


def _get_project_or_404(db: Session, project_id: UUID, user_id: UUID) -> Project:
    project: Project | None = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()
    if not project or project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return project


@router.post(
    "/projects/{project_id}",
    response_model=EnvironmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_environment_for_project(
    project_id: UUID,
    env_in: EnvironmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_project_or_404(db, project_id, current_user.id)

    env = Environment(
        project_id=project.id,
        name=env_in.name,
        type=env_in.type,
        status="provisioning",
        config=env_in.config,
    )

    if env_in.type == "ephemeral" and env_in.ttl_hours:
        env.expires_at = datetime.now(timezone.utc) + timedelta(hours=env_in.ttl_hours)

    db.add(env)
    db.commit()
    db.refresh(env)

    # fake background provisioning
    background_tasks.add_task(provision_environment, env.id, SessionLocal)

    return env


@router.get("/projects/{project_id}", response_model=list[EnvironmentRead])
def list_environments_for_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_or_404(db, project_id, current_user.id)

    envs = (
        db.execute(select(Environment).where(Environment.project_id == project_id))
        .scalars()
        .all()
    )

    return envs


@router.get("/{env_id}", response_model=EnvironmentRead)
def get_environment(
    env_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    env: Environment | None = db.execute(
        select(Environment).where(Environment.id == env_id)
    ).scalar_one_or_none()

    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found"
        )

    # verify ownership via project
    project: Project | None = db.execute(
        select(Project).where(Project.id == env.project_id)
    ).scalar_one_or_none()

    if not project or project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found"
        )

    return env


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_environment(
    env_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    env: Environment | None = db.execute(
        select(Environment).where(Environment.id == env_id)
    ).scalar_one_or_none()

    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found"
        )

    project: Project | None = db.execute(
        select(Project).where(Project.id == env.project_id)
    ).scalar_one_or_none()

    if not project or project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found"
        )

    db.delete(env)
    db.commit()
