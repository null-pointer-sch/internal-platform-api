from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional

from app.models.deployment import Deployment


def get_deployment_by_id(db: Session, deployment_id: UUID) -> Optional[Deployment]:
    return db.execute(select(Deployment).where(Deployment.id == deployment_id)).scalar_one_or_none()


def create_deployment(db: Session, dep: Deployment) -> Deployment:
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


def list_deployments_by_environment(db: Session, env_id: UUID) -> List[Deployment]:
    return db.execute(select(Deployment).where(Deployment.environment_id == env_id)).scalars().all()


def save_deployment(db: Session, dep: Deployment) -> Deployment:
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep
