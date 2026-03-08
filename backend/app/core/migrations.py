# app/core/migrations.py
import logging
from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine

logger = logging.getLogger("envctl")
TIMESTAMP_TZ = "TIMESTAMP WITH TIME ZONE"

def ensure_user_columns(engine: Engine):
    """
    Ensures that all required security columns exist in the users table.
    SQLAlchemy's create_all doesn't add columns to existing tables.
    """
    required_columns = {
        "is_verified": "BOOLEAN DEFAULT FALSE NOT NULL",
        "verification_token_hash": "VARCHAR(255)",
        "verification_token_expires_at": TIMESTAMP_TZ,
        "password_reset_token_hash": "VARCHAR(255)",
        "password_reset_token_expires_at": TIMESTAMP_TZ,
        "failed_login_attempts": "INTEGER DEFAULT 0 NOT NULL",
        "last_failed_login_at": TIMESTAMP_TZ,
        "lockout_until": TIMESTAMP_TZ,
    }

    try:
        inspector = inspect(engine)
        existing_columns = [col["name"] for col in inspector.get_columns("users")]
        
        with engine.connect() as conn:
            for column_name, column_type in required_columns.items():
                if column_name not in existing_columns:
                    logger.info(f"Adding missing column '{column_name}' to users table.")
                    # Handle SQLite vs Postgres differences for column types if necessary
                    # For BOOLEAN/INTEGER it's mostly same. TIMESTAMP varies but 
                    # generic enough works for both in most DBs.
                    type_str = column_type
                    if engine.url.drivername == "sqlite":
                         if TIMESTAMP_TZ in type_str:
                             type_str = "DATETIME"
                    
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {type_str}"))
            conn.commit()
            logger.info("Database schema check completed.")
    except Exception as e:
        logger.error(f"Error during database migration: {e}")
        # We don't raise here to allow the app to attempt starting anyway, 
        # though it will likely fail later if crucial columns are missing.

def ensure_deployment_columns(engine: Engine):
    """
    Ensures that all required columns exist in the deployments table.
    """
    required_columns = {
        "logs": "TEXT",
        "app_logs": "TEXT",
    }

    try:
        inspector = inspect(engine)
        existing_columns = [col["name"] for col in inspector.get_columns("deployments")]
        
        with engine.connect() as conn:
            for column_name, column_type in required_columns.items():
                if column_name not in existing_columns:
                    logger.info(f"Adding missing column '{column_name}' to deployments table.")
                    conn.execute(text(f"ALTER TABLE deployments ADD COLUMN {column_name} {column_type}"))
            conn.commit()
            logger.info("Deployments table schema check completed.")
    except Exception as e:
        logger.error(f"Error during deployments database migration: {e}")
