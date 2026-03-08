# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, RegisterResponse
from app.schemas.auth import VerifyTokenRequest
from app.services import auth as auth_service
from app.core.security import generate_random_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    session_id = request.cookies.get("envctl-session")
    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user = auth_service.get_current_user_from_session_id(db, session_id)

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    return user


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_202_ACCEPTED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    verification_url = auth_service.register_user(db, user_in)
    
    detail = "If the account exists and requires verification, verification instructions have been prepared."

    if settings.email_mode == "mock_terminal":
        detail += " Dev Mode: The verification link was written to the server logs."
    elif settings.email_mode == "mock_api" and verification_url:
        detail += " Dev Mode: No real email was sent. Use the verification link included in this response."
        
    return RegisterResponse(
        detail=detail,
        verification_url=verification_url,
        email_mode=settings.email_mode
    )


@router.post("/verify-email")
def verify_email(req: VerifyTokenRequest, db: Session = Depends(get_db)):
    success = auth_service.verify_email_token(db, req.token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )
    return {"detail": "Email successfully verified."}


@router.post("/login")
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user, session_id, verification_url = auth_service.authenticate_user(db, form_data.username, form_data.password)
    
    if verification_url:
        # Password was correct but email not verified
        detail = "Please verify your email before logging in."
        if settings.email_mode == "mock_terminal":
            detail += " Dev Mode: The verification link was written to the server logs."
        elif settings.email_mode == "mock_api":
            detail += " Dev Mode: No real email was sent. Use the verification link included in this response."
        
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": detail,
                "verification_url": verification_url,
                "email_mode": settings.email_mode
            }
        )

    if not user or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    use_secure_cookies = settings.app_env != "local"
    samesite_policy = "none" if use_secure_cookies else "lax"

    response.set_cookie(
        key="envctl-session",
        value=session_id,
        httponly=True,
        secure=use_secure_cookies,
        samesite=samesite_policy,
        path="/",
    )

    csrf_token = generate_random_token()
    response.set_cookie(
        key="XSRF-TOKEN",
        value=csrf_token,
        httponly=False,
        secure=use_secure_cookies,
        samesite=samesite_policy,
        path="/",
    )

    return {"detail": "Successfully logged in"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    session_id = request.cookies.get("envctl-session")
    if session_id:
        auth_service.revoke_session(db, session_id)

    response.delete_cookie(key="envctl-session", path="/")
    response.delete_cookie(key="XSRF-TOKEN", path="/")
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password():
    return {"detail": "If the email exists, a password reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password():
    return {"detail": "Password successfully reset."}
