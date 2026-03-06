from uuid import UUID
from sqlalchemy.orm import Session
from app.core.exceptions import ResourceNotFoundException

from app.models.project import Project
from app.schemas.project import ProjectCreate
import app.repositories.projects as projects_repo


def get_projects_for_user(db: Session, user_id: UUID) -> list[Project]:
    return projects_repo.get_projects_by_owner(db, user_id)


def create_project_for_user(
    db: Session, project_in: ProjectCreate, user_id: UUID
) -> Project:
    return projects_repo.create_project(db, project_in, user_id)


def get_project_by_id_for_user(db: Session, project_id: UUID, user_id: UUID) -> Project:
    project = projects_repo.get_project_by_id_and_owner(db, project_id, user_id)
    if not project:
        raise ResourceNotFoundException(detail="Project not found")
    return project


def delete_project_for_user(db: Session, project_id: UUID, user_id: UUID):
    project = get_project_by_id_for_user(db, project_id, user_id)
    projects_repo.delete_project(db, project)
