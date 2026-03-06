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
    """Register + login and return Authorization headers."""
    register_user(client, email, password)
    resp = login_user(client, email, password)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─── Registration ───


def test_register_success(client):
    response = register_user(client)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "created_at" in data


def test_register_duplicate_email(client):
    register_user(client)
    response = register_user(client)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"].lower()


def test_register_invalid_email(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "testpassword123"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_short_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "short"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ─── Login ───


def test_login_success(client):
    register_user(client)
    response = login_user(client)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


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
