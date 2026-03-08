import uuid

from fastapi import status

from tests.api.test_auth import auth_headers


def create_project(client, headers, name="Test Project"):
    """Helper to create a project and return the response."""
    return client.post(
        "/api/v1/projects",
        json={"name": name, "description": "A test project"},
        headers=headers,
    )


# ─── CRUD ───


def test_create_project(client):
    headers = auth_headers(client)
    response = create_project(client, headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert "id" in data


def test_list_projects(client):
    headers = auth_headers(client)
    create_project(client, headers, "Project A")
    create_project(client, headers, "Project B")

    response = client.get("/api/v1/projects", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    names = {p["name"] for p in data}
    assert names == {"Project A", "Project B"}


def test_get_project(client):
    headers = auth_headers(client)
    project_id = create_project(client, headers).json()["id"]

    response = client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == project_id


def test_delete_project(client):
    headers = auth_headers(client)
    project_id = create_project(client, headers).json()["id"]

    response = client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify it's gone
    response = client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_project_not_found(client):
    headers = auth_headers(client)
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/projects/{fake_id}", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


# ─── Isolation ───


def test_project_isolation(client):
    """User A cannot see User B's projects."""
    # Step 1: Login User A and create project
    headers_a = auth_headers(client, email="a@example.com")
    create_project(client, headers_a, "A's Project")

    # Step 2: Login User B and verify they see nothing
    headers_b = auth_headers(client, email="b@example.com")
    response = client.get("/api/v1/projects", headers=headers_b)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) == 0

    # Step 3: Switch back to User A and verify they see their project
    headers_a = auth_headers(client, email="a@example.com")
    response = client.get("/api/v1/projects", headers=headers_a)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) == 1
