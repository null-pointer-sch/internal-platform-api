from sqlalchemy.orm import Session

from app.core.exceptions import InvalidOperationException
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate
import app.repositories.users as users_repo


def register_user(db: Session, user_in: UserCreate) -> User:
    existing = users_repo.get_user_by_email(db, user_in.email)
    if existing:
        raise InvalidOperationException(detail="Email already registered")

    user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
    )
    return users_repo.create_user(db, user)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = users_repo.get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
