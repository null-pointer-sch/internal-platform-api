import pytest
import uuid
from app.services.provisioning import provision_environment
from app.models.environment import Environment
from app.models.project import Project
from app.models.user import User

def test_provision_environment_success(test_db):
    def db_factory():
        return test_db
    
    # Need a user for owner_id
    user = User(email="prov-owner@test.com", password_hash="hash")
    test_db.add(user)
    test_db.flush()
        
    project = Project(name="Prov Project", owner_id=user.id)
    test_db.add(project)
    test_db.flush()
    
    env = Environment(
        project_id=project.id,
        name="Prov Env",
        type="ephemeral",
        status="provisioning"
    )
    test_db.add(env)
    test_db.flush()
    
    env_id = env.id
    
    # Run provisioning
    provision_environment(env_id, db_factory)
    
    # Re-fetch to avoid detachment issues
    env_after = test_db.query(Environment).filter(Environment.id == env_id).first()
    assert env_after.status == "running"
    assert env_after.base_url is not None
    assert env_after.expires_at is not None

def test_provision_environment_not_found(test_db):
    def db_factory():
        return test_db
    
    # Use real UUID object
    provision_environment(uuid.uuid4(), db_factory)
