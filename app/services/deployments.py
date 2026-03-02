import time
from uuid import UUID

from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.deployment import Deployment
from app.models.environment import Environment
from app.models.project import Project
from app.schemas.deployment import DeploymentCreate


def run_deployment(deployment_id, db_factory=SessionLocal):
    db: Session = db_factory()
    try:
        dep: Deployment | None = db.execute(
            select(Deployment).where(Deployment.id == deployment_id)
        ).scalar_one_or_none()

        if not dep:
            return

        env: Environment | None = db.execute(
            select(Environment).where(Environment.id == dep.environment_id)
        ).scalar_one_or_none()

        if not env:
            dep.status = "failed"
            db.add(dep)
            db.commit()
            return

        # Simulate "deploying"
        dep.status = "running"
        db.add(dep)
        db.commit()

        time.sleep(2)

        # In real life: helm upgrade / kubectl apply / etc.
        dep.status = "succeeded"
        dep.logs_url = f"https://logs.envctl.local/deployments/{dep.id}"

        db.add(dep)
        db.commit()

    finally:
        db.close()


def get_env_owned_by_user(
    db: Session,
    env_id: UUID,
    user_id: UUID,
) -> Environment:
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

    if not project or project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found"
        )

    return env


def create_deployment(
    db: Session,
    background_tasks: BackgroundTasks,
    env_id: UUID,
    dep_in: DeploymentCreate,
    user_id: UUID,
) -> Deployment:
    env = get_env_owned_by_user(db, env_id, user_id)

    if env.status != "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Environment is not ready (status={env.status})",
        )

    dep = Deployment(
        environment_id=env.id,
        version=dep_in.version,
        status="pending",
    )

    db.add(dep)
    db.commit()
    db.refresh(dep)

    background_tasks.add_task(run_deployment, dep.id, SessionLocal)

    return dep


def list_deployments(db: Session, env_id: UUID, user_id: UUID) -> list[Deployment]:
    get_env_owned_by_user(db, env_id, user_id)
    return (
        db.execute(select(Deployment).where(Deployment.environment_id == env_id))
        .scalars()
        .all()
    )


def get_deployment_by_id(db: Session, deployment_id: UUID, user_id: UUID) -> Deployment:
    dep: Deployment | None = db.execute(
        select(Deployment).where(Deployment.id == deployment_id)
    ).scalar_one_or_none()

    if not dep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found"
        )

    # verify env → project → owner
    env: Environment | None = db.execute(
        select(Environment).where(Environment.id == dep.environment_id)
    ).scalar_one_or_none()
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found"
        )

    project: Project | None = db.execute(
        select(Project).where(Project.id == env.project_id)
    ).scalar_one_or_none()
    if not project or project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found"
        )

    return dep
