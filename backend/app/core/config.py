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
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:4200")
    app_env: str = os.getenv("APP_ENV", "local")  # local | staging | production

    @property
    def is_development(self) -> bool:
        return self.app_env != "production"

    # Email Configuration
    # EMAIL_MODE can be: "mock_terminal" (logs to stdout), "mock_api" (returns link in API response), or "real" (sends actual email)
    # Default to "mock_api" if running in Cloud Run (detected via K_SERVICE) and no mode is set.
    email_mode: str = os.getenv(
        "EMAIL_MODE", 
        "mock_api" if os.getenv("K_SERVICE") else "mock_terminal"
    )
    require_email_verification: bool = os.getenv("REQUIRE_EMAIL_VERIFICATION", "true").lower() == "true"
    
    # Real Email Settings (SMTP)
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")  # Note: smtp_password was using SMTP_USER env var? Likely a bug in previous edit, fixing to SMTP_PASSWORD
    smtp_from: str = os.getenv("SMTP_FROM", "noreply@envctl.com")


settings = Settings()
