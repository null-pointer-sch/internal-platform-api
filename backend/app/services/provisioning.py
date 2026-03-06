import time
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

import app.repositories.environments as environments_repo


def provision_environment(env_id, db_factory):
    # db_factory will be SessionLocal, to avoid keeping a session across threads
    db: Session = db_factory()
    try:
        env = environments_repo.get_environment_by_id(db, env_id)

        if not env:
            return

        # simulate work
        time.sleep(2)

        # fake URL (in real life, from ingress / K8s / etc)
        env.status = "running"
        env.base_url = f"https://{env.id}.envctl.local"

        # optionally set expiry for ephemeral envs
        if env.type == "ephemeral" and env.expires_at is None:
            env.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        environments_repo.save_environment(db, env)
    finally:
        db.close()
