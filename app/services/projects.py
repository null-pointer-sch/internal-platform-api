from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.project import Project
from app.schemas.project import ProjectCreate


def get_projects_for_user(db: Session, user_id: UUID) -> list[Project]:
    return (
        db.query(Project)
        .filter(Project.owner_id == user_id)
        .order_by(Project.created_at.desc())
        .all()
    )


def create_project_for_user(
    db: Session, project_in: ProjectCreate, user_id: UUID
) -> Project:
    project = Project(
        name=project_in.name,
        description=project_in.description,
        repo_url=str(project_in.repo_url) if project_in.repo_url else None,
        owner_id=user_id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_project_by_id_for_user(db: Session, project_id: UUID, user_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return project


def delete_project_for_user(db: Session, project_id: UUID, user_id: UUID):
    project = get_project_by_id_for_user(db, project_id, user_id)
    db.delete(project)
    db.commit()
