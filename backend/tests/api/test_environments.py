import uuid
from fastapi import status
from tests.api.test_auth import auth_headers
from tests.api.test_projects import create_project

def create_environment(client, headers, project_id, name="Test Env", type="persistent"):
    """Helper to create an environment."""
    return client.post(
        f"/api/v1/environments/projects/{project_id}",
        json={"name": name, "type": type},
        headers=headers,
    )

def test_create_environment(client):
    headers = auth_headers(client)
    project_id = create_project(client, headers).json()["id"]
    
    response = create_environment(client, headers, project_id)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Test Env"
    assert data["type"] == "persistent"
    assert data["project_id"] == project_id
    assert "id" in data

def test_list_environments(client):
    headers = auth_headers(client)
    project_id = create_project(client, headers).json()["id"]
    create_environment(client, headers, project_id, "Env A")
    create_environment(client, headers, project_id, "Env B")
    
    response = client.get(f"/api/v1/environments/projects/{project_id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    names = {e["name"] for e in data}
    assert names == {"Env A", "Env B"}

def test_get_environment(client):
    headers = auth_headers(client)
    project_id = create_project(client, headers).json()["id"]
    env_id = create_environment(client, headers, project_id).json()["id"]
    
    response = client.get(f"/api/v1/environments/{env_id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == env_id

def test_delete_environment(client):
    headers = auth_headers(client)
    project_id = create_project(client, headers).json()["id"]
    env_id = create_environment(client, headers, project_id).json()["id"]
    
    response = client.delete(f"/api/v1/environments/{env_id}", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify it's gone
    response = client.get(f"/api/v1/environments/{env_id}", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_environment_isolation(client):
    """User A cannot see or access User B's environments."""
    # User A creates a project and environment
    headers_a = auth_headers(client, email="a@example.com")
    project_a_id = create_project(client, headers_a, "Project A").json()["id"]
    env_a_id = create_environment(client, headers_a, project_a_id, "Env A").json()["id"]
    
    # User B tries to list A's environments or get A's environment
    headers_b = auth_headers(client, email="b@example.com")
    
    # List (should be empty as it's filtered by user's projects, or 404 if project not found for user)
    # The API implementation likely returns 404 if the project is not found for the current user
    response = client.get(f"/api/v1/environments/projects/{project_a_id}", headers=headers_b)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    
    # Get direct
    response = client.get(f"/api/v1/environments/{env_a_id}", headers=headers_b)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_ephemeral_environment(client):
    headers = auth_headers(client)
    project_id = create_project(client, headers).json()["id"]
    
    response = client.post(
        f"/api/v1/environments/projects/{project_id}",
        json={"name": "Ephemeral Env", "type": "ephemeral", "ttl_hours": 24},
        headers=headers,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["type"] == "ephemeral"
    # Note: the model might store ttl_hours, let's check
    # assert data["ttl_hours"] == 24
