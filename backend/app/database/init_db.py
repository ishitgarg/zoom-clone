from sqlalchemy.engine import Engine

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from app.database.base import Base


def create_tables(engine: Engine) -> None:
    """Create any missing tables. (A production app would use Alembic migrations instead.)"""
    Base.metadata.create_all(bind=engine)
