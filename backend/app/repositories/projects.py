from uuid import UUID
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.project import Project
from app.schemas.project import ProjectCreate


def get_projects_by_owner(db: Session, owner_id: UUID) -> List[Project]:
    return (
        db.query(Project)
        .filter(Project.owner_id == owner_id)
        .order_by(Project.created_at.desc())
        .all()
    )


def create_project(db: Session, project_in: ProjectCreate, owner_id: UUID) -> Project:
    project = Project(
        name=project_in.name,
        description=project_in.description,
        repo_url=str(project_in.repo_url) if project_in.repo_url else None,
        owner_id=owner_id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_project_by_id_and_owner(
    db: Session, project_id: UUID, owner_id: UUID
) -> Optional[Project]:
    return (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == owner_id)
        .first()
    )


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()
