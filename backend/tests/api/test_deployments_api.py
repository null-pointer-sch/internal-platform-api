import pytest
import uuid
from fastapi import status
from tests.api.test_auth import auth_headers
from tests.api.test_projects import create_project
from tests.api.test_environments import create_environment
from app.models.environment import Environment

def create_deployment(client, headers, environment_id, version="v1.0.0"):
    response = client.post(
        f"/api/v1/deployments/environments/{environment_id}",
        json={"version": version},
        headers=headers
    )
    return response

def test_get_deployment_logs(client, test_db):
    headers = auth_headers(client)
    project = create_project(client, headers, "Log Project").json()
    env = create_environment(client, headers, project["id"], "Log Env").json()
    
    # Manually set environment status to 'running'
    env_id = uuid.UUID(env["id"])
    db_env = test_db.query(Environment).filter(Environment.id == env_id).first()
    db_env.status = "running"
    test_db.commit()

    dep_response = create_deployment(client, headers, env["id"])
    assert dep_response.status_code == status.HTTP_201_CREATED
    dep_id = dep_response.json()["id"]

    response = client.get(f"/api/v1/deployments/{dep_id}/logs", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "deployment_logs" in data
    assert "app_logs" in data

def test_get_deployment_logs_not_found(client):
    headers = auth_headers(client)
    response = client.get(f"/api/v1/deployments/{uuid.uuid4()}/logs", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_get_deployment_logs_unauthorized(client):
    response = client.get(f"/api/v1/deployments/{uuid.uuid4()}/logs")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_list_deployments(client, test_db):
    headers = auth_headers(client)
    project = create_project(client, headers, "List Dep Project").json()
    env = create_environment(client, headers, project["id"], "List Dep Env").json()
    
    # Manually set environment status to 'running'
    env_id = uuid.UUID(env["id"])
    db_env = test_db.query(Environment).filter(Environment.id == env_id).first()
    db_env.status = "running"
    test_db.commit()

    create_deployment(client, headers, env["id"], "v1")
    create_deployment(client, headers, env["id"], "v2")

    response = client.get(f"/api/v1/deployments/environments/{env['id']}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 2

def test_get_deployment_status(client, test_db):
    headers = auth_headers(client)
    project = create_project(client, headers, "Status Project").json()
    env = create_environment(client, headers, project["id"], "Status Env").json()
    
    # Manually set environment status to 'running'
    env_id = uuid.UUID(env["id"])
    db_env = test_db.query(Environment).filter(Environment.id == env_id).first()
    db_env.status = "running"
    test_db.commit()

    dep_response = create_deployment(client, headers, env["id"])
    assert dep_response.status_code == status.HTTP_201_CREATED
    dep_id = dep_response.json()["id"]

    response = client.get(f"/api/v1/deployments/{dep_id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == dep_id
