from fastapi import status


def register_user(client, email="test@example.com", password="testpassword123"):
    """Helper to register a user and return the response."""
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )


def login_user(client, email="test@example.com", password="testpassword123"):
    """Helper to login a user and return the response."""
    return client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )


def auth_headers(client, email="test@example.com", password="testpassword123"):
    """Register + login and set context in client for subsequents requests."""
    from app.core.database import get_db
    from app.main import app
    from app.repositories.users import get_user_by_email

    # Clear to ensure we are testing a fresh session
    client.cookies.clear()

    register_user(client, email, password)

    # Manually verify the user so login succeeds
    db_gen = app.dependency_overrides.get(get_db, get_db)()
    db = next(db_gen)
    user = get_user_by_email(db, email)
    user.is_verified = True
    db.commit()

    login_user(client, email, password)
    xsrf_token = client.cookies.get("XSRF-TOKEN")
    return {"X-XSRF-TOKEN": xsrf_token} if xsrf_token else {}


# ─── Registration ───


def test_register_success(client):
    response = register_user(client)
    assert response.status_code == status.HTTP_202_ACCEPTED
    data = response.json()
    assert "verification instructions have been prepared" in data["detail"]


def test_register_duplicate_email(client):
    register_user(client)
    response = register_user(client)
    # The new implementation returns 202 even for duplicates to prevent email enumeration
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert "verification instructions have been prepared" in response.json()["detail"]


def test_register_invalid_email(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "testpassword123"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_register_short_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "short"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


# ─── Login ───


def test_login_success(client):
    from app.core.database import get_db
    from app.main import app
    from app.repositories.users import get_user_by_email

    register_user(client)

    db_gen = app.dependency_overrides.get(get_db, get_db)()
    db = next(db_gen)
    user = get_user_by_email(db, "test@example.com")
    user.is_verified = True
    db.commit()

    response = login_user(client)
    assert response.status_code == status.HTTP_200_OK
    assert "Successfully logged in" in response.json()["detail"]
    assert "envctl-session" in client.cookies
    assert "XSRF-TOKEN" in client.cookies


def test_login_unverified(client):
    register_user(client)
    # User is registered but not verified by default
    response = login_user(client)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    data = response.json()
    assert "verify your email" in data["detail"]
    assert "verification_url" in data
    assert data["verification_url"] is not None


def test_login_wrong_password(client):
    register_user(client)
    response = login_user(client, password="wrongpassword")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_nonexistent_user(client):
    response = login_user(client, email="nobody@example.com")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ─── /me ───


def test_me_authenticated(client):
    headers = auth_headers(client)
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["email"] == "test@example.com"


def test_me_unauthenticated(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
