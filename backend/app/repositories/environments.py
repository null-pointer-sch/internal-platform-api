from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional

from app.models.environment import Environment


def create_environment(db: Session, env: Environment) -> Environment:
    db.add(env)
    db.commit()
    db.refresh(env)
    return env


def get_environments_for_project(db: Session, project_id: UUID) -> List[Environment]:
    return (
        db.execute(select(Environment).where(Environment.project_id == project_id))
        .scalars()
        .all()
    )


def get_environment_by_id(db: Session, env_id: UUID) -> Optional[Environment]:
    return db.execute(
        select(Environment).where(Environment.id == env_id)
    ).scalar_one_or_none()


def delete_environment(db: Session, env: Environment) -> None:
    db.delete(env)
    db.commit()


def save_environment(db: Session, env: Environment) -> Environment:
    db.add(env)
    db.commit()
    db.refresh(env)
    return env
