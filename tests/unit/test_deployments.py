from app.models.deployment import Deployment
from app.models.environment import Environment
from app.models.project import Project
from app.models.user import User
from app.services.deployments import run_deployment


def test_run_deployment_success(test_db):
    # Setup
    user = User(email="t@t.com", password_hash="pw")
    test_db.add(user)
    test_db.commit()

    project = Project(name="p1", owner_id=user.id)
    test_db.add(project)
    test_db.commit()

    env = Environment(
        project_id=project.id, name="e1", status="running", type="ephemeral"
    )
    test_db.add(env)
    test_db.commit()

    dep = Deployment(environment_id=env.id, version="v1", status="pending")
    test_db.add(dep)
    test_db.commit()
    dep_id = dep.id

    # Needs a db_factory that returns the session
    def db_factory():
        return test_db

    # execute
    original_close = test_db.close
    test_db.close = lambda: None
    try:
        run_deployment(deployment_id=dep_id, db_factory=db_factory)
    finally:
        test_db.close = original_close

    # verify
    test_db.refresh(dep)
    assert dep.status == "succeeded"
    assert "https://" in dep.logs_url


def test_run_deployment_failed_env_not_found(test_db):
    # Setup
    user = User(email="t@t.com", password_hash="pw")
    test_db.add(user)
    test_db.commit()

    project = Project(name="p1", owner_id=user.id)
    test_db.add(project)
    test_db.commit()

    # Create deployment pointing to non-existent env (or we delete env)

    env = Environment(
        project_id=project.id, name="e1", status="running", type="ephemeral"
    )
    test_db.add(env)
    test_db.commit()

    dep = Deployment(environment_id=env.id, version="v1", status="pending")
    test_db.add(dep)
    test_db.commit()

    test_db.delete(env)
    test_db.commit()

    dep_id = dep.id

    def db_factory():
        return test_db

    original_close = test_db.close
    test_db.close = lambda: None
    try:
        run_deployment(deployment_id=dep_id, db_factory=db_factory)
    finally:
        test_db.close = original_close

    test_db.refresh(dep)
    assert dep.status == "failed"
