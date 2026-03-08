import pytest
from unittest.mock import patch
from app.services.email import send_verification_email, send_password_reset_email, _send_real_email

@pytest.fixture
def mock_settings():
    with patch("app.services.email.settings") as mock:
        mock.frontend_url = "http://localhost:4200"
        mock.email_mode = "mock_terminal"
        mock.smtp_user = "user@example.com"
        mock.smtp_password = "password"
        mock.smtp_host = "smtp.example.com"
        mock.smtp_port = 587
        mock.smtp_from = "noreply@example.com"
        yield mock

def test_send_verification_email_mock_terminal(mock_settings):
    mock_settings.email_mode = "mock_terminal"
    email = "test@example.com"
    token = "verify-token"
    
    link = send_verification_email(email, token)
    
    assert link == f"http://localhost:4200/verify-email?token={token}"

def test_send_verification_email_mock_api(mock_settings):
    mock_settings.email_mode = "mock_api"
    email = "test@example.com"
    token = "verify-token"
    
    link = send_verification_email(email, token)
    
    assert link == f"http://localhost:4200/verify-email?token={token}"

def test_send_verification_email_real(mock_settings):
    mock_settings.email_mode = "real"
    email = "test@example.com"
    token = "verify-token"
    
    with patch("app.services.email._send_real_email") as mock_send:
        link = send_verification_email(email, token)
        assert link is None
        mock_send.assert_called_once()

def test_send_password_reset_email_mock_terminal(mock_settings):
    mock_settings.email_mode = "mock_terminal"
    email = "test@example.com"
    token = "reset-token"
    
    link = send_password_reset_email(email, token)
    
    assert link == f"http://localhost:4200/reset-password?token={token}"

def test_send_password_reset_email_mock_api(mock_settings):
    mock_settings.email_mode = "mock_api"
    email = "test@example.com"
    token = "reset-token"
    
    link = send_password_reset_email(email, token)
    
    assert link == f"http://localhost:4200/reset-password?token={token}"

def test_send_password_reset_email_real(mock_settings):
    mock_settings.email_mode = "real"
    email = "test@example.com"
    token = "reset-token"
    
    with patch("app.services.email._send_real_email") as mock_send:
        link = send_password_reset_email(email, token)
        assert link is None
        mock_send.assert_called_once()

@patch("smtplib.SMTP")
def test_send_real_email_success(mock_smtp, mock_settings):
    mock_settings.smtp_user = "user"
    mock_settings.smtp_password = "pass"
    
    server_instance = mock_smtp.return_value.__enter__.return_value
    
    _send_real_email("to@example.com", "Subject", "Body")
    
    server_instance.starttls.assert_called_once()
    server_instance.login.assert_called_once_with("user", "pass")
    server_instance.send_message.assert_called_once()

def test_send_real_email_missing_creds(mock_settings):
    mock_settings.smtp_user = None
    
    with patch("app.services.email.logger") as mock_logger:
        _send_real_email("to@example.com", "Subject", "Body")
        mock_logger.error.assert_called_with("SMTP credentials missing. Cannot send real email.")

@patch("smtplib.SMTP")
def test_send_real_email_exception(mock_smtp, mock_settings):
    mock_settings.smtp_user = "user"
    mock_settings.smtp_password = "pass"
    
    server_instance = mock_smtp.return_value.__enter__.return_value
    server_instance.login.side_effect = Exception("SMTP Error")
    
    with patch("app.services.email.logger") as mock_logger:
        _send_real_email("to@example.com", "Subject", "Body")
        mock_logger.error.assert_called()
        assert "Failed to send email" in mock_logger.error.call_args[0][0]
