from app.core.config import Settings

def test_frontend_url_default():
    # Verify the current settings object has a default if not set in env (which it isn't in test env usually)
    from app.core.config import settings
    assert hasattr(settings, "frontend_url")

def test_frontend_url_constructor():
    # Verify we can set it via constructor
    settings = Settings(frontend_url="https://myapp.cloud")
    assert settings.frontend_url == "https://myapp.cloud"

def test_cors_preflight():
    from app.main import app
    from starlette.testclient import TestClient
    client = TestClient(app)
    # Simulate a preflight request from the configured frontend
    from app.core.config import settings
    headers = {
        "Origin": settings.frontend_url,
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == settings.frontend_url

def test_email_service_links(caplog):
    import logging
    from app.services.email import send_verification_email
    from app.core.config import settings
    
    with caplog.at_level(logging.INFO):
        send_verification_email("test@example.com", "token123")
        assert f"{settings.frontend_url}/verify-email?token=token123" in caplog.text
