"""FastAPI application entry point: wiring, middleware and error handling."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.database.init_db import create_tables
from app.database.session import SessionLocal, engine
from app.seed.seed import seed_if_empty
from app.services.user_service import ensure_default_user

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    create_tables(engine)
    with SessionLocal() as db:
        ensure_default_user(db)
        if settings.seed_on_startup:
            seed_if_empty(db)
    yield


def _friendly_validation_message(exc: RequestValidationError) -> str:
    """Turn Pydantic's error list into one human-readable sentence for the UI."""
    first = exc.errors()[0] if exc.errors() else {}
    message = str(first.get("msg", "Invalid request"))
    message = message.removeprefix("Value error, ")
    field = next((str(part) for part in reversed(first.get("loc", ())) if isinstance(part, str)), None)
    if field and field not in {"body", "query", "path"} and first.get("type") != "value_error":
        return f"{field.replace('_', ' ').capitalize()}: {message}"
    return message


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, "code": exc.code})

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_request: Request, exc: RequestValidationError):
        errors = [
            {"loc": list(e.get("loc", ())), "msg": str(e.get("msg", "")).removeprefix("Value error, ")}
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={"detail": _friendly_validation_message(exc), "code": "validation_error", "errors": errors},
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_database_error(request: Request, exc: SQLAlchemyError):
        logger.exception("Database error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "A database error occurred. Please try again.", "code": "database_error"},
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong on our side. Please try again.", "code": "internal_error"},
        )


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Participant-Token"],
    )
    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
