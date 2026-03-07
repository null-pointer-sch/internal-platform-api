from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import time
import logging

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.migrations import ensure_user_columns
from app.core.seed import seed_db
from app.core.middleware import CSRFMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.environments import router as environments_router
from app.api.v1.deployments import router as deployments_router
from app.core.exceptions import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    ResourceNotFoundException,
    resource_not_found_exception_handler,
    InvalidOperationException,
    invalid_operation_exception_handler,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("envctl")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    max_retries = 10
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            ensure_user_columns(engine)
            logger.info("Database connected and tables created/updated successfully.")

            with SessionLocal() as db:
                seed_db(db)
            
            logger.info("==========================================")
            logger.info(f"APP_ENV: {settings.app_env}")
            logger.info(f"EMAIL_MODE: {settings.email_mode}")
            logger.info(f"REQUIRE_EMAIL_VERIFICATION: {settings.require_email_verification}")
            logger.info("==========================================")
            break
        except OperationalError as e:
            if attempt < max_retries - 1:
                logger.warning(
                    f"DB connection failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {retry_delay} seconds..."
                )
                time.sleep(retry_delay)
            else:
                logger.error("Max retries reached. Could not connect to database.")
                raise

    yield  # Application runs here

    # Shutdown (if needed)
    logger.info("Application shutting down.")


app = FastAPI(lifespan=lifespan)

# Custom diagnostic logging for preflight debugging
@app.middleware("http")
async def log_preflight_diagnostic(request: Request, call_next):
    if request.method == "OPTIONS":
        logger.info(f"PREFLIGHT DIAGNOSTIC: Method={request.method}, Path={request.url.path}")
        logger.info(f"PREFLIGHT DIAGNOSTIC: Origin={request.headers.get('origin')}")
        logger.info(f"PREFLIGHT DIAGNOSTIC: ACR-Method={request.headers.get('access-control-request-method')}")
        logger.info(f"PREFLIGHT DIAGNOSTIC: ACR-Headers={request.headers.get('access-control-request-headers')}")
    
    response = await call_next(request)
    
    if request.method == "OPTIONS":
        logger.info(f"PREFLIGHT DIAGNOSTIC: Response Status={response.status_code}")
    return response


# Middleware Order: Outer to Inner
# CORSMiddleware must be OUTERMOST (last added) to handle preflights before any other logic.
# CSRFMiddleware should be INNER to CORS.

app.add_middleware(CSRFMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(
    ResourceNotFoundException, resource_not_found_exception_handler
)
app.add_exception_handler(
    InvalidOperationException, invalid_operation_exception_handler
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(environments_router, prefix="/api/v1")
app.include_router(deployments_router, prefix="/api/v1")


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise StarletteHTTPException(status_code=503, detail="Database not available")
    return {"status": "ok"}
