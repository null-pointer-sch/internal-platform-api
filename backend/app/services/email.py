import logging
import smtplib
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("envctl")


def _get_verification_link(token: str) -> str:
    return f"{settings.frontend_url}/verify-email?token={token}"


def _get_reset_link(token: str) -> str:
    return f"{settings.frontend_url}/reset-password?token={token}"


def send_verification_email(email: str, token: str) -> str | None:
    """
    Send verification email based on settings.email_mode.
    Returns the link if in 'mock_api' mode, otherwise returns None.
    """
    link = _get_verification_link(token)
    mode = settings.email_mode

    if mode == "mock_terminal":
        logger.info("\n==========================================")
        logger.info(f"MOCK EMAIL (TERMINAL): Verification link for {email}")
        logger.info(f"Link: {link}")
        logger.info("==========================================\n")
        return link
    elif mode == "mock_api":
        logger.info(f"MOCK EMAIL (API): Verification link for {email} prepared for API response.")
        return link
    elif mode == "real":
        _send_real_email(
            email,
            "Verify your email",
            f"Please click here to verify your email: {link}",
        )
    
    return None


def send_password_reset_email(email: str, token: str) -> str | None:
    """
    Send password reset email based on settings.email_mode.
    """
    link = _get_reset_link(token)
    mode = settings.email_mode

    if mode == "mock_terminal":
        logger.info("\n==========================================")
        logger.info(f"MOCK EMAIL (TERMINAL): Password reset link for {email}")
        logger.info(f"Link: {link}")
        logger.info("==========================================\n")
        return link
    elif mode == "mock_api":
        return link
    elif mode == "real":
        _send_real_email(
            email,
            "Reset your password",
            f"Please click here to reset your password: {link}",
        )
    
    return None


def _send_real_email(to_email: str, subject: str, body: str):
    """
    Actually send an email using SMTP.
    """
    if not settings.smtp_user or not settings.smtp_password:
        logger.error("SMTP credentials missing. Cannot send real email.")
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info(f"Successfully sent email to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
