from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
    generate_random_token,
    hash_token,
    generate_session_id,
)
from app.models.user import User
from app.models.session import Session as SessionModel
from app.schemas.user import UserCreate
from app.services.email import send_verification_email
from app.core.config import settings

import app.repositories.users as users_repo
import app.repositories.sessions as sessions_repo


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Ensure a datetime is timezone-aware and set to UTC, handling naive datetimes from SQLite."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def register_user(db: Session, user_in: UserCreate) -> str | None:
    """
    Register a user. If they already exist, we silently do nothing or resend email.
    To prevent enumeration, we always return generic success from the API.
    Returns the verification link if in mock modes.
    """
    email = user_in.email.lower().strip()
    existing = users_repo.get_user_by_email(db, email)

    verification_link = None
    
    # If user exists, we decide whether to resend verification
    if existing:
        if not existing.is_verified and settings.require_email_verification:
            # Resend/Update verification token
            raw_token = generate_random_token()
            existing.verification_token_hash = hash_token(raw_token)
            existing.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            users_repo.update_user(db, existing)
            verification_link = send_verification_email(existing.email, raw_token)
        elif existing.is_verified:
            import logging
            logger = logging.getLogger("envctl")
            logger.info(f"Registration attempt for already verified account: {email}. Silently ignoring.")
        
        return verification_link

    # New user
    raw_token = generate_random_token()
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # If verification is NOT required, we can auto-verify them immediately
    is_verified = not settings.require_email_verification

    user = User(
        email=email,
        password_hash=hash_password(user_in.password),
        is_verified=is_verified,
        verification_token_hash=None if is_verified else token_hash,
        verification_token_expires_at=None if is_verified else expires_at,
    )
    users_repo.create_user(db, user)
    
    if not is_verified:
        verification_link = send_verification_email(user.email, raw_token)
        
    return verification_link


def verify_email_token(db: Session, token: str) -> bool:
    """
    Verify the user's email using the raw token.
    """
    token_hash = hash_token(token)
    user = users_repo.get_user_by_verification_token_hash(db, token_hash)

    if not user:
        return False

    expires_at = ensure_utc(user.verification_token_expires_at)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        return False

    user.is_verified = True
    user.verification_token_hash = None
    user.verification_token_expires_at = None
    users_repo.update_user(db, user)
    return True


def authenticate_user(
    db: Session, email: str, password: str
) -> tuple[User | None, str | None, str | None]:
    """
    Authenticate user, enforce lockouts, return (User, raw_session_id, verification_link) if successful.
    """
    normalized_email = email.lower().strip()
    user = users_repo.get_user_by_email(db, normalized_email)

    if not user:
        import logging
        logger = logging.getLogger("envctl")
        logger.warning(f"Authentication failed: User {normalized_email} not found.")
        return None, None, None

    # Check Lockout
    lockout_until = ensure_utc(user.lockout_until)
    if lockout_until and lockout_until > datetime.now(timezone.utc):
        import logging
        logger = logging.getLogger("envctl")
        logger.warning(f"Authentication failed: User {normalized_email} is locked out until {lockout_until}.")
        return None, None, None

    # Check Password
    if not verify_password(password, user.password_hash):
        import logging
        logger = logging.getLogger("envctl")
        logger.warning(f"Authentication failed: Incorrect password for {normalized_email}.")
        # Apply Lockout Policy
        user.failed_login_attempts += 1
        user.last_failed_login_at = datetime.now(timezone.utc)
        if user.failed_login_attempts >= 5:
            user.lockout_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        users_repo.update_user(db, user)
        return None, None, None

    # Check Verified Status (Must be verified to login if required)
    if settings.require_email_verification and not user.is_verified:
        # Securely resend verification email on correct password for unverified account
        raw_token = generate_random_token()
        user.verification_token_hash = hash_token(raw_token)
        user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(
            hours=24
        )
        users_repo.update_user(db, user)
        verification_link = send_verification_email(user.email, raw_token)
        return None, None, verification_link

    # Success: Reset lockouts
    user.failed_login_attempts = 0
    user.lockout_until = None
    user.last_failed_login_at = None
    users_repo.update_user(db, user)

    # Create Session
    raw_session_id = generate_session_id()
    session_hash = hash_token(raw_session_id)
    session_expires = datetime.now(timezone.utc) + timedelta(days=7)

    session_record = SessionModel(
        user_id=user.id, session_id_hash=session_hash, expires_at=session_expires
    )
    sessions_repo.create_session(db, session_record)

    return user, raw_session_id, None


def get_current_user_from_session_id(db: Session, raw_session_id: str) -> User | None:
    if not raw_session_id:
        return None

    session_hash = hash_token(raw_session_id)
    session_record = sessions_repo.get_session_by_hash(db, session_hash)

    if not session_record:
        return None

    revoked_at = ensure_utc(session_record.revoked_at)
    expires_at = ensure_utc(session_record.expires_at)

    if revoked_at or (expires_at and expires_at < datetime.now(timezone.utc)):
        return None

    # Update last seen (throttle this in high-traffic, but fine for now)
    session_record.last_seen_at = datetime.now(timezone.utc)
    sessions_repo.update_session(db, session_record)

    return users_repo.get_user_by_id(db, session_record.user_id)


def revoke_session(db: Session, raw_session_id: str) -> None:
    if not raw_session_id:
        return

    session_hash = hash_token(raw_session_id)
    session_record = sessions_repo.get_session_by_hash(db, session_hash)

    if session_record and not session_record.revoked_at:
        session_record.revoked_at = datetime.now(timezone.utc)
        sessions_repo.update_session(db, session_record)
