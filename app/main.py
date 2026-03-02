from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import time
import logging

from app.core.database import Base, engine
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.environments import router as environments_router
from app.api.v1.deployments import router as deployments_router
from app.core.exceptions import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("envctl")

app = FastAPI()

app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(environments_router, prefix="/api/v1")
app.include_router(deployments_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    max_retries = 10
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            # Test the connection first
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            logger.info("Database connected and tables created successfully.")
            return  # Success, exit the function
        except OperationalError as e:
            if attempt < max_retries - 1:
                logger.warning(
                    f"DB connection failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {retry_delay} seconds..."
                )
                time.sleep(retry_delay)
            else:
                logger.error("Max retries reached. Could not connect to database.")
                raise  # After max retries, let it fail


@app.get("/health")
def health():
    # optional: basic DB check
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise StarletteHTTPException(status_code=503, detail="Database not available")
    return {"status": "ok"}
