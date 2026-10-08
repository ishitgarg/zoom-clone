from datetime import datetime

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.time import UTCDateTime, utcnow


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Adds created_at / updated_at columns maintained by the ORM."""

    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow, nullable=False)
