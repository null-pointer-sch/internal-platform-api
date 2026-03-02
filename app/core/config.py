from pydantic import BaseModel
import os


class Settings(BaseModel):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./envctl.db",  # fallback for local non-docker dev
    )
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me-in-prod")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_minutes: int = 60


settings = Settings()
